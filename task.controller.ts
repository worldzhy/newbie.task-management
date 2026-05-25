import {Controller, Get, Post, Patch, Param, Body, UseGuards, Req, BadRequestException, Query} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiProperty} from '@nestjs/swagger';
import {JwtAuthGuard} from '../../microservices/account/security/passport/jwt/jwt.guard';
import {TaskService} from './task.service';
import {IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString} from 'class-validator';
import {UserRequest} from '../../microservices/account/account.interface';
import {TaskCronService} from './task-cron.service';

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;
}

import {TaskStatus} from './task.service';

export class UpdateTaskApiDto {
  @ApiProperty({enum: TaskStatus})
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  dueDate?: Date;
}

export class CreateTaskApiDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({enum: TaskStatus})
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  dueDate?: Date;
}

export class GenerateMonthlyReportDto {
  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsNumber()
  month: number;
}

export class LinkTaskUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taskUserId: string;
}

export class LinkTaskProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taskProjectId: string;
}

export class UnlinkTaskProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;
}

export class UpdateMonthlyReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

@ApiTags('Task Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskCronService: TaskCronService
  ) {}

  @Get('users')
  @ApiOperation({summary: 'List all TaskUsers'})
  async listTaskUsers() {
    const taskUsers = await this.taskService.listTaskUsers();
    return {success: true, data: taskUsers};
  }

  @Get('users/me')
  @ApiOperation({summary: 'Get the TaskUser linked to the current Nightwatch user'})
  async getLinkedTaskUser(@Req() req: UserRequest) {
    const userId = (req.user as any).id || req.user.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    const taskUser = await this.taskService.getTaskUserByUserId(userId);
    return {success: true, data: taskUser};
  }

  @Post('users/link')
  @ApiOperation({summary: 'Link current Nightwatch user to a TaskUser'})
  async linkTaskUser(@Body() dto: LinkTaskUserDto, @Req() req: UserRequest) {
    try {
      const userId = (req.user as any).id || req.user.userId;
      const result = await this.taskService.linkTaskUser(userId, dto.taskUserId);
      return {success: true, data: result};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {success: false, message};
    }
  }

  @Post('users/unlink')
  @ApiOperation({summary: 'Unlink current Nightwatch user from their TaskUser'})
  async unlinkTaskUser(@Req() req: UserRequest) {
    try {
      const userId = (req.user as any).id || req.user.userId;
      const result = await this.taskService.unlinkTaskUser(userId);
      return {success: true, data: result};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {success: false, message};
    }
  }

  @Get('projects')
  @ApiOperation({summary: 'List all TaskProjects'})
  async listTaskProjects() {
    const taskProjects = await this.taskService.listTaskProjects();
    return {success: true, data: taskProjects};
  }

  @Get('projects/linked/:projectId')
  @ApiOperation({summary: 'Get the TaskProject linked to the given Nightwatch project'})
  async getLinkedTaskProject(@Param('projectId') projectId: string) {
    const taskProject = await this.taskService.getTaskProjectByProjectId(projectId);
    return {success: true, data: taskProject};
  }

  @Post('projects/link')
  @ApiOperation({summary: 'Link Nightwatch project to a TaskProject'})
  async linkTaskProject(@Body() dto: LinkTaskProjectDto) {
    try {
      const result = await this.taskService.linkTaskProject(dto.projectId, dto.taskProjectId);
      return {success: true, data: result};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {success: false, message};
    }
  }

  @Post('projects/unlink')
  @ApiOperation({summary: 'Unlink Nightwatch project from its TaskProject'})
  async unlinkTaskProject(@Body() dto: UnlinkTaskProjectDto) {
    try {
      const result = await this.taskService.unlinkTaskProject(dto.projectId);
      return {success: true, data: result};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {success: false, message};
    }
  }

  @Post('groups')
  @ApiOperation({summary: 'Create or update a Task Project Group'})
  async createGroup(@Body() dto: CreateGroupDto) {
    return await this.taskService.createOrUpdateGroup(dto);
  }

  @Get('groups')
  @ApiOperation({summary: 'List all Task Project Groups'})
  async listGroups() {
    return await this.taskService.listGroups();
  }

  @Get('projects/:projectId/members')
  @ApiOperation({summary: 'List project members by Nightwatch projectId'})
  async listProjectMembers(@Param('projectId') projectId: string) {
    const members = await this.taskService.listTaskUsersByProjectId(projectId);
    return {success: true, data: members};
  }

  @Get('projects/:projectId/items')
  @ApiOperation({summary: 'List tasks by Nightwatch projectId'})
  async listTasksByProjectId(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('assigneeName') assigneeName?: string
  ) {
    // 1. Find the linked taskProjectId
    const taskProject = await this.taskService.getTaskProjectByProjectId(projectId);

    if (!taskProject) {
      // If not linked, return empty paginated result
      return {
        success: true,
        data: {
          records: [],
          total: 0,
          page: Number(page) || 0,
          pageSize: Number(pageSize) || 10,
        },
      };
    }

    // 2. Fetch tasks for this taskProjectId
    const p = Number(page) || 0;
    const s = Number(pageSize) || 10;
    const skip = p * s;
    const take = s;

    // We pass taskProject.groupId as the first argument, and taskProject.id as the 5th argument
    const result = await this.taskService.listTasks(
      taskProject.groupId,
      status as any,
      keyword,
      assigneeName,
      taskProject.id,
      true, // includeCompleted
      skip,
      take
    );

    return {
      success: true,
      data: {
        records: result?.tasks || [],
        total: result?.total || 0,
        page: p,
        pageSize: s,
      },
    };
  }
  @ApiOperation({summary: 'List tasks in a group'})
  async listTasks(@Param('groupId') groupId: string) {
    return await this.taskService.listTasks(groupId);
  }

  @Post('projects/:projectId/items')
  @ApiOperation({summary: 'Create a new task for a project'})
  async createTask(@Param('projectId') projectId: string, @Body() dto: CreateTaskApiDto, @Req() req: UserRequest) {
    const taskProject = await this.taskService.getTaskProjectByProjectId(projectId);
    if (!taskProject) {
      throw new BadRequestException('Project not linked to any TaskProject');
    }
    const creatorId = (req.user as any).id || req.user.userId;
    const taskUser = await this.taskService.getTaskUserByUserId(creatorId);

    const result = await this.taskService.createTask({
      ...dto,
      groupId: taskProject.groupId,
      taskProjectId: taskProject.id,
      creatorId: taskUser?.id,
    });
    return {success: true, data: result};
  }

  @Patch('items/:taskId')
  @ApiOperation({summary: 'Update a task'})
  async updateTask(@Param('taskId') taskId: string, @Body() dto: UpdateTaskApiDto, @Req() req: UserRequest) {
    const operator = {
      id: req.user.userId,
      name: req.user.userId,
      source: 'SYSTEM',
    };

    return await this.taskService.updateTask(taskId, {
      ...dto,
      lastOperatorId: operator.id,
      lastOperatorName: operator.name,
      lastOperatorSource: operator.source,
    });
  }

  @Post('items/:taskId/delete')
  @ApiOperation({summary: 'Soft delete a task'})
  async deleteTask(@Param('taskId') taskId: string, @Req() req: UserRequest) {
    const operator = {
      id: req.user.userId,
      name: req.user.userId,
      source: 'SYSTEM',
    };
    return await this.taskService.deleteTask(taskId, operator);
  }

  @Post('projects/:projectId/monthly-report')
  @ApiOperation({summary: 'Manually trigger monthly report generation for a project'})
  async generateMonthlyReport(@Param('projectId') projectId: string, @Body() dto: GenerateMonthlyReportDto) {
    return await this.taskCronService.generateAndSendMonthlyReportForProject(projectId, dto.year, dto.month);
  }

  @Get('projects/:projectId/reports/weekly')
  @ApiOperation({summary: 'List weekly reports for a project'})
  async listWeeklyReports(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const taskProject = await this.taskService.getTaskProjectByProjectId(projectId);
    if (!taskProject) {
      return {success: true, data: {records: [], total: 0, page: Number(page) || 0, pageSize: Number(pageSize) || 10}};
    }

    const p = Number(page) || 0;
    const s = Number(pageSize) || 10;
    const result = await this.taskService.listWeeklyReports(taskProject.groupId, p * s, s);
    return {success: true, data: {...result, page: p, pageSize: s}};
  }

  @Get('projects/:projectId/reports/monthly')
  @ApiOperation({summary: 'List monthly reports for a project'})
  async listMonthlyReports(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const taskProject = await this.taskService.getTaskProjectByProjectId(projectId);
    if (!taskProject) {
      return {success: true, data: {records: [], total: 0, page: Number(page) || 0, pageSize: Number(pageSize) || 10}};
    }

    const p = Number(page) || 0;
    const s = Number(pageSize) || 10;
    const result = await this.taskService.listMonthlyReports(taskProject.id, p * s, s);
    return {success: true, data: {...result, page: p, pageSize: s}};
  }

  @Patch('projects/:projectId/reports/monthly/:reportId')
  @ApiOperation({summary: 'Update a monthly report'})
  async updateMonthlyReport(@Param('reportId') reportId: string, @Body() dto: UpdateMonthlyReportDto) {
    const result = await this.taskService.updateMonthlyReportContent(reportId, dto.content);
    return {success: true, data: result};
  }
}
