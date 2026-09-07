import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { TaskService } from './task.service.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';
import { SprintStatus } from './enums/sprint-status.enum.js';
import {
  AddLabelToTaskInput,
  AddSprintTaskInput,
  AddTaskDependencyInput,
  AssignTaskInput,
  CreateLabelInput,
  CreateSprintInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  DeleteLabelResponseDto,
  DeleteSprintResponseDto,
  DeleteTaskResponseDto,
  LabelResponseDto,
  RemoveLabelFromTaskInput,
  RemoveSprintTaskInput,
  RemoveTaskDependencyInput,
  SprintResponseDto,
  TaskActionResponseDto,
  TaskCommentResponseDto,
  TaskDependencyResponseDto,
  TaskResponseDto,
  UnassignTaskInput,
  UpdateLabelInput,
  UpdateSprintInput,
  UpdateTaskCommentInput,
  UpdateTaskInput,
  UpdateTaskPositionInput,
} from './dto/task.dto.js';

@Resolver(() => TaskResponseDto)
@UseGuards(JwtAuthGuard)
export class TaskResolver {
  constructor(private readonly taskService: TaskService) {}

  // ==========================================
  // TASK QUERIES
  // ==========================================

  @Query(() => TaskResponseDto, {
    name: 'task',
    description: 'Fetch task details by unique pubId',
  })
  async task(
    @Args('pubId', { type: () => String, description: 'Task pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TaskResponseDto> {
    return this.taskService.getTask(pubId, userId);
  }

  @Query(() => [TaskResponseDto], {
    name: 'projectTasks',
    description: 'Fetch all tasks belonging to a project with optional filters',
  })
  async projectTasks(
    @Args('projectPubId', {
      type: () => String,
      description: 'Project unique pubId',
    })
    projectPubId: string,
    @CurrentUser('id') userId: number,
    @Args('status', {
      type: () => TaskStatus,
      nullable: true,
      description: 'Filter by task status',
    })
    status?: TaskStatus,
    @Args('priority', {
      type: () => TaskPriority,
      nullable: true,
      description: 'Filter by task priority',
    })
    priority?: TaskPriority,
    @Args('sprintPubId', {
      type: () => String,
      nullable: true,
      description: 'Filter by sprint pubId',
    })
    sprintPubId?: string,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.listProjectTasks(projectPubId, userId, {
      status,
      priority,
      sprintPubId,
    });
  }

  @Query(() => [TaskResponseDto], {
    name: 'userTasks',
    description: 'Fetch tasks assigned to the authenticated user',
  })
  async userTasks(
    @CurrentUser('id') userId: number,
    @Args('status', {
      type: () => TaskStatus,
      nullable: true,
      description: 'Filter by task status',
    })
    status?: TaskStatus,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.listUserTasks(userId, { status });
  }

  // ==========================================
  // TASK MUTATIONS
  // ==========================================

  @Mutation(() => TaskResponseDto, {
    description: 'Create a new task within a project',
  })
  async createTask(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateTaskInput,
  ): Promise<TaskResponseDto> {
    return this.taskService.createTask(userId, input);
  }

  @Mutation(() => TaskResponseDto, {
    description: 'Update task details',
  })
  async updateTask(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Task pubId' })
    pubId: string,
    @Args('input') input: UpdateTaskInput,
  ): Promise<TaskResponseDto> {
    return this.taskService.updateTask(pubId, userId, input);
  }

  @Mutation(() => TaskResponseDto, {
    description: 'Update task board position and optional status column',
  })
  async updateTaskPosition(
    @CurrentUser('id') userId: number,
    @Args('input') input: UpdateTaskPositionInput,
  ): Promise<TaskResponseDto> {
    return this.taskService.updateTaskPosition(userId, input);
  }

  @Mutation(() => DeleteTaskResponseDto, {
    description: 'Delete/archive a task',
  })
  async deleteTask(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Task pubId' })
    pubId: string,
  ): Promise<DeleteTaskResponseDto> {
    return this.taskService.deleteTask(pubId, userId);
  }

  // ==========================================
  // ASSIGNEE MUTATIONS
  // ==========================================

  @Mutation(() => TaskActionResponseDto, {
    description: 'Assign a user to a task',
  })
  async assignTask(
    @CurrentUser('id') userId: number,
    @Args('input') input: AssignTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.assignTask(userId, input);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Unassign a user from a task',
  })
  async unassignTask(
    @CurrentUser('id') userId: number,
    @Args('input') input: UnassignTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.unassignTask(userId, input);
  }

  // ==========================================
  // LABEL QUERIES & MUTATIONS
  // ==========================================

  @Query(() => [LabelResponseDto], {
    name: 'organizationLabels',
    description: 'Fetch all labels defined in an organization',
  })
  async organizationLabels(
    @Args('organizationPubId', {
      type: () => String,
      description: 'Organization pubId or slug',
    })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<LabelResponseDto[]> {
    return this.taskService.listOrganizationLabels(organizationPubId, userId);
  }

  @Mutation(() => LabelResponseDto, {
    description: 'Create an organization-level task label',
  })
  async createLabel(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateLabelInput,
  ): Promise<LabelResponseDto> {
    return this.taskService.createLabel(userId, input);
  }

  @Mutation(() => LabelResponseDto, {
    description: 'Update a label name or color',
  })
  async updateLabel(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Label pubId' })
    pubId: string,
    @Args('input') input: UpdateLabelInput,
  ): Promise<LabelResponseDto> {
    return this.taskService.updateLabel(pubId, userId, input);
  }

  @Mutation(() => DeleteLabelResponseDto, {
    description: 'Delete a label from an organization',
  })
  async deleteLabel(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Label pubId' })
    pubId: string,
  ): Promise<DeleteLabelResponseDto> {
    return this.taskService.deleteLabel(pubId, userId);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Attach a label to a task',
  })
  async addLabelToTask(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddLabelToTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.addLabelToTask(userId, input);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Detach a label from a task',
  })
  async removeLabelFromTask(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveLabelFromTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.removeLabelFromTask(userId, input);
  }

  // ==========================================
  // COMMENT QUERIES & MUTATIONS
  // ==========================================

  @Query(() => [TaskCommentResponseDto], {
    name: 'taskComments',
    description: 'Fetch all comments for a task',
  })
  async taskComments(
    @Args('taskPubId', { type: () => String, description: 'Task pubId' })
    taskPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TaskCommentResponseDto[]> {
    return this.taskService.listTaskComments(taskPubId, userId);
  }

  @Mutation(() => TaskCommentResponseDto, {
    description: 'Post a comment on a task',
  })
  async createTaskComment(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateTaskCommentInput,
  ): Promise<TaskCommentResponseDto> {
    return this.taskService.createTaskComment(userId, input);
  }

  @Mutation(() => TaskCommentResponseDto, {
    description: 'Update an existing comment',
  })
  async updateTaskComment(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Comment pubId' })
    pubId: string,
    @Args('input') input: UpdateTaskCommentInput,
  ): Promise<TaskCommentResponseDto> {
    return this.taskService.updateTaskComment(pubId, userId, input);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Delete a task comment',
  })
  async deleteTaskComment(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Comment pubId' })
    pubId: string,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.deleteTaskComment(pubId, userId);
  }

  // ==========================================
  // DEPENDENCY MUTATIONS
  // ==========================================

  @Mutation(() => TaskDependencyResponseDto, {
    description: 'Create a dependency/blocker relationship between two tasks',
  })
  async addTaskDependency(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddTaskDependencyInput,
  ): Promise<TaskDependencyResponseDto> {
    return this.taskService.addTaskDependency(userId, input);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Remove a task dependency relationship',
  })
  async removeTaskDependency(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveTaskDependencyInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.removeTaskDependency(userId, input);
  }

  // ==========================================
  // SPRINT QUERIES & MUTATIONS
  // ==========================================

  @Query(() => SprintResponseDto, {
    name: 'sprint',
    description: 'Fetch sprint details by pubId',
  })
  async sprint(
    @Args('pubId', { type: () => String, description: 'Sprint pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<SprintResponseDto> {
    return this.taskService.getSprint(pubId, userId);
  }

  @Query(() => [SprintResponseDto], {
    name: 'projectSprints',
    description: 'Fetch all sprints belonging to a project',
  })
  async projectSprints(
    @Args('projectPubId', {
      type: () => String,
      description: 'Project pubId',
    })
    projectPubId: string,
    @CurrentUser('id') userId: number,
    @Args('status', {
      type: () => SprintStatus,
      nullable: true,
      description: 'Filter by sprint status',
    })
    status?: SprintStatus,
  ): Promise<SprintResponseDto[]> {
    return this.taskService.listProjectSprints(projectPubId, userId, status);
  }

  @Mutation(() => SprintResponseDto, {
    description: 'Create a new sprint within a project',
  })
  async createSprint(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateSprintInput,
  ): Promise<SprintResponseDto> {
    return this.taskService.createSprint(userId, input);
  }

  @Mutation(() => SprintResponseDto, {
    description: 'Update sprint details and milestone timeline',
  })
  async updateSprint(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Sprint pubId' })
    pubId: string,
    @Args('input') input: UpdateSprintInput,
  ): Promise<SprintResponseDto> {
    return this.taskService.updateSprint(pubId, userId, input);
  }

  @Mutation(() => DeleteSprintResponseDto, {
    description: 'Delete a sprint from a project',
  })
  async deleteSprint(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Sprint pubId' })
    pubId: string,
  ): Promise<DeleteSprintResponseDto> {
    return this.taskService.deleteSprint(pubId, userId);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Add a task to a sprint',
  })
  async addTaskToSprint(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddSprintTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.addTaskToSprint(userId, input);
  }

  @Mutation(() => TaskActionResponseDto, {
    description: 'Remove a task from a sprint',
  })
  async removeTaskFromSprint(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveSprintTaskInput,
  ): Promise<TaskActionResponseDto> {
    return this.taskService.removeTaskFromSprint(userId, input);
  }
}
