import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationRole } from '../organization/enums/organization-role.enum.js';
import * as OrgHelper from '../organization/organization.helper.js';
import * as UserHelper from '../user/user.helper.js';
import * as ProjectHelper from '../project/project.helper.js';
import * as TaskHelper from './task.helper.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';
import { DependencyType } from './enums/dependency-type.enum.js';
import { SprintStatus } from './enums/sprint-status.enum.js';
import type {
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
import type {
  PrismaLabelRecord,
  SprintWithDetails,
  TaskCommentWithAuthor,
  TaskWithDetails,
} from './types/task.types.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';
import type { UserResponseDto } from '../auth/dto/auth.dto.js';
import type { ProjectResponseDto } from '../project/dto/project.dto.js';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // PERMISSION & SCOPE RESOLUTION
  // ==========================================

  private async resolveUser(userPubIdOrEmail: string) {
    const user = userPubIdOrEmail.includes('@')
      ? await UserHelper.findUserByEmail(this.prisma, userPubIdOrEmail)
      : await UserHelper.findUserByPubId(this.prisma, userPubIdOrEmail);

    if (!user) {
      throw new NotFoundException(`User '${userPubIdOrEmail}' not found`);
    }
    return user;
  }

  private async resolveProject(projectPubId: string) {
    const project = await ProjectHelper.findProjectByPubId(
      this.prisma,
      projectPubId,
    );
    if (!project) {
      throw new NotFoundException(`Project '${projectPubId}' not found`);
    }
    return project;
  }

  private async resolveTask(taskPubId: string) {
    const task = await TaskHelper.findTaskByPubId(this.prisma, taskPubId);
    if (!task) {
      throw new NotFoundException(`Task '${taskPubId}' not found`);
    }
    return task;
  }

  private async resolveSprint(sprintPubId: string) {
    const sprint = await TaskHelper.findSprintByPubId(this.prisma, sprintPubId);
    if (!sprint) {
      throw new NotFoundException(`Sprint '${sprintPubId}' not found`);
    }
    return sprint;
  }

  private async resolveLabel(labelPubId: string) {
    const label = await TaskHelper.findLabelByPubId(this.prisma, labelPubId);
    if (!label) {
      throw new NotFoundException(`Label '${labelPubId}' not found`);
    }
    return label;
  }

  private async ensureOrgMember(organizationId: number, userId: number) {
    const member = await OrgHelper.findByOrgAndUser(
      this.prisma,
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return member;
  }

  private async ensureCanManageProjectTasks(
    organizationId: number,
    userId: number,
    createdById?: number,
  ) {
    const member = await this.ensureOrgMember(organizationId, userId);
    const isElevated =
      member.role === OrganizationRole.OWNER ||
      member.role === OrganizationRole.ADMIN ||
      member.role === OrganizationRole.MANAGER ||
      member.role === OrganizationRole.DEVELOPER ||
      member.role === OrganizationRole.QA ||
      (createdById !== undefined && createdById === userId);

    if (!isElevated) {
      throw new ForbiddenException(
        'You do not have permission to modify tasks in this organization',
      );
    }
    return member;
  }

  // ==========================================
  // TASK CRUD & ACTIONS
  // ==========================================

  async createTask(
    userId: number,
    input: CreateTaskInput,
  ): Promise<TaskResponseDto> {
    try {
      const project = await this.resolveProject(input.projectPubId);
      await this.ensureCanManageProjectTasks(project.organizationId, userId);

      let parentTaskId: number | null = null;
      if (input.parentTaskPubId) {
        const parentTask = await this.resolveTask(input.parentTaskPubId);
        if (parentTask.projectId !== project.id) {
          throw new BadRequestException(
            'Parent task must belong to the same project',
          );
        }
        parentTaskId = parentTask.id;
      }

      const task = await TaskHelper.createTask(this.prisma, {
        projectId: project.id,
        createdById: userId,
        parentTaskId,
        title: input.title,
        description: input.description,
        status: input.status ?? TaskStatus.TODO,
        priority: input.priority ?? TaskPriority.MEDIUM,
        position: input.position ?? 0,
        dueDate: input.dueDate,
      });

      // Initial assignees
      if (input.assigneeUserPubIds && input.assigneeUserPubIds.length > 0) {
        for (const userPubId of input.assigneeUserPubIds) {
          try {
            const user = await this.resolveUser(userPubId);
            await TaskHelper.assignUserToTask(this.prisma, task.id, user.id);
          } catch (err) {
            this.logger.warn(`Failed to assign user ${userPubId}: ${err}`);
          }
        }
      }

      // Initial labels
      if (input.labelPubIds && input.labelPubIds.length > 0) {
        for (const labelPubId of input.labelPubIds) {
          try {
            const label = await this.resolveLabel(labelPubId);
            if (label.organizationId === project.organizationId) {
              await TaskHelper.addLabelToTask(this.prisma, task.id, label.id);
            }
          } catch (err) {
            this.logger.warn(`Failed to add label ${labelPubId}: ${err}`);
          }
        }
      }

      // Initial sprint
      if (input.sprintPubId) {
        const sprint = await this.resolveSprint(input.sprintPubId);
        if (sprint.projectId === project.id) {
          await TaskHelper.addTaskToSprint(this.prisma, sprint.id, task.id);
        }
      }

      const freshTask = await TaskHelper.findTaskById(this.prisma, task.id);
      return this.mapTaskToDto(freshTask!);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async updateTask(
    pubId: string,
    userId: number,
    input: UpdateTaskInput,
  ): Promise<TaskResponseDto> {
    try {
      const task = await this.resolveTask(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureCanManageProjectTasks(
        project.organizationId,
        userId,
        task.createdById,
      );

      let parentTaskId: number | null | undefined = undefined;
      if (input.parentTaskPubId !== undefined) {
        if (input.parentTaskPubId.trim() === '') {
          parentTaskId = null;
        } else {
          const parent = await this.resolveTask(input.parentTaskPubId);
          if (parent.id === task.id) {
            throw new BadRequestException('A task cannot be its own parent');
          }
          if (parent.projectId !== task.projectId) {
            throw new BadRequestException(
              'Parent task must belong to the same project',
            );
          }
          parentTaskId = parent.id;
        }
      }

      const updated = await TaskHelper.updateTask(this.prisma, task.id, {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        position: input.position,
        dueDate: input.dueDate,
        parentTaskId,
      });

      if (!updated) throw new NotFoundException('Task not found after update');
      return this.mapTaskToDto(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async updateTaskPosition(
    userId: number,
    input: UpdateTaskPositionInput,
  ): Promise<TaskResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      const updated = await TaskHelper.updateTaskPosition(
        this.prisma,
        task.id,
        input.position,
        input.status,
      );

      if (!updated) throw new NotFoundException('Task not found');
      return this.mapTaskToDto(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update task position: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to update task position');
    }
  }

  async deleteTask(
    pubId: string,
    userId: number,
  ): Promise<DeleteTaskResponseDto> {
    try {
      const task = await this.resolveTask(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      const member = await this.ensureOrgMember(project.organizationId, userId);
      const isOwnerOrAdmin =
        member.role === OrganizationRole.OWNER ||
        member.role === OrganizationRole.ADMIN ||
        task.createdById === userId;

      if (!isOwnerOrAdmin) {
        throw new ForbiddenException(
          'Only organization admins or task creators can delete tasks',
        );
      }

      await TaskHelper.deleteTask(this.prisma, task.id);
      return {
        success: true,
        message: `Task '${pubId}' has been deleted`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  async getTask(pubId: string, userId: number): Promise<TaskResponseDto> {
    try {
      const task = await this.resolveTask(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);
      return this.mapTaskToDto(task);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to get task');
    }
  }

  async listProjectTasks(
    projectPubId: string,
    userId: number,
    filters?: { status?: TaskStatus; priority?: TaskPriority; sprintPubId?: string },
  ): Promise<TaskResponseDto[]> {
    try {
      const project = await this.resolveProject(projectPubId);
      await this.ensureOrgMember(project.organizationId, userId);

      if (filters?.sprintPubId) {
        const sprint = await this.resolveSprint(filters.sprintPubId);
        const sprintTasks = await TaskHelper.listSprintTasks(
          this.prisma,
          sprint.id,
        );
        const filtered = sprintTasks.filter((t) => {
          if (filters.status && t.status !== filters.status) return false;
          if (filters.priority && t.priority !== filters.priority) return false;
          return true;
        });
        return filtered.map((t) => this.mapTaskToDto(t));
      }

      const tasks = await TaskHelper.listTasksByProject(
        this.prisma,
        project.id,
        filters,
      );
      return tasks.map((t) => this.mapTaskToDto(t));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to list project tasks: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to list project tasks');
    }
  }

  async listUserTasks(
    userId: number,
    filters?: { status?: TaskStatus },
  ): Promise<TaskResponseDto[]> {
    try {
      const tasks = await TaskHelper.listTasksByAssignee(
        this.prisma,
        userId,
        filters,
      );
      return tasks.map((t) => this.mapTaskToDto(t));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to list user tasks: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to list user tasks');
    }
  }

  // ==========================================
  // ASSIGNEE OPERATIONS
  // ==========================================

  async assignTask(
    userId: number,
    input: AssignTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      const targetUser = await this.resolveUser(input.userPubId);
      await this.ensureOrgMember(project.organizationId, targetUser.id);

      await TaskHelper.assignUserToTask(this.prisma, task.id, targetUser.id);
      return {
        success: true,
        message: `User '${targetUser.email}' assigned to task '${task.pubId}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to assign task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to assign task');
    }
  }

  async unassignTask(
    userId: number,
    input: UnassignTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);
      const targetUser = await this.resolveUser(input.userPubId);

      await TaskHelper.unassignUserFromTask(this.prisma, task.id, targetUser.id);
      return {
        success: true,
        message: `User '${targetUser.email}' unassigned from task '${task.pubId}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to unassign task: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to unassign task');
    }
  }

  // ==========================================
  // LABEL OPERATIONS
  // ==========================================

  async createLabel(
    userId: number,
    input: CreateLabelInput,
  ): Promise<LabelResponseDto> {
    try {
      const org = await OrgHelper.findByPubIdOrSlug(
        this.prisma,
        input.organizationPubId,
      );
      if (!org) throw new NotFoundException('Organization not found');

      await this.ensureCanManageProjectTasks(org.id, userId);

      const existing = await TaskHelper.findLabelByNameAndOrg(
        this.prisma,
        org.id,
        input.name,
      );
      if (existing) {
        throw new ConflictException(
          `Label '${input.name}' already exists in this organization`,
        );
      }

      const label = await TaskHelper.createLabel(this.prisma, {
        organizationId: org.id,
        name: input.name,
        color: input.color,
      });

      return this.mapLabelToDto(label, org.pubId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create label: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to create label');
    }
  }

  async updateLabel(
    pubId: string,
    userId: number,
    input: UpdateLabelInput,
  ): Promise<LabelResponseDto> {
    try {
      const label = await this.resolveLabel(pubId);
      await this.ensureCanManageProjectTasks(label.organizationId, userId);

      if (input.name) {
        const existing = await TaskHelper.findLabelByNameAndOrg(
          this.prisma,
          label.organizationId,
          input.name,
        );
        if (existing && existing.id !== label.id) {
          throw new ConflictException(
            `Label '${input.name}' already exists in this organization`,
          );
        }
      }

      const updated = await TaskHelper.updateLabel(this.prisma, label.id, input);
      if (!updated) throw new NotFoundException('Label not found');

      const org = await OrgHelper.findOrgById(this.prisma, label.organizationId);
      return this.mapLabelToDto(updated, org?.pubId ?? '');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update label: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to update label');
    }
  }

  async deleteLabel(
    pubId: string,
    userId: number,
  ): Promise<DeleteLabelResponseDto> {
    try {
      const label = await this.resolveLabel(pubId);
      await this.ensureCanManageProjectTasks(label.organizationId, userId);

      await TaskHelper.deleteLabel(this.prisma, label.id);
      return {
        success: true,
        message: `Label '${pubId}' has been deleted`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete label: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to delete label');
    }
  }

  async listOrganizationLabels(
    organizationPubId: string,
    userId: number,
  ): Promise<LabelResponseDto[]> {
    try {
      const org = await OrgHelper.findByPubIdOrSlug(
        this.prisma,
        organizationPubId,
      );
      if (!org) throw new NotFoundException('Organization not found');

      await this.ensureOrgMember(org.id, userId);

      const labels = await TaskHelper.listLabelsByOrg(this.prisma, org.id);
      return labels.map((l) => this.mapLabelToDto(l, org.pubId));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to list organization labels: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to list organization labels',
      );
    }
  }

  async addLabelToTask(
    userId: number,
    input: AddLabelToTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);
      const label = await this.resolveLabel(input.labelPubId);

      if (label.organizationId !== project.organizationId) {
        throw new BadRequestException(
          'Label does not belong to the same organization as the project',
        );
      }

      await TaskHelper.addLabelToTask(this.prisma, task.id, label.id);
      return {
        success: true,
        message: `Label '${label.name}' attached to task '${task.pubId}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to add label to task: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to add label to task');
    }
  }

  async removeLabelFromTask(
    userId: number,
    input: RemoveLabelFromTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);
      const label = await this.resolveLabel(input.labelPubId);

      await TaskHelper.removeLabelFromTask(this.prisma, task.id, label.id);
      return {
        success: true,
        message: `Label '${label.name}' removed from task '${task.pubId}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove label from task: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to remove label from task',
      );
    }
  }

  // ==========================================
  // TASK COMMENT OPERATIONS
  // ==========================================

  async createTaskComment(
    userId: number,
    input: CreateTaskCommentInput,
  ): Promise<TaskCommentResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      const comment = await TaskHelper.createTaskComment(this.prisma, {
        taskId: task.id,
        authorId: userId,
        content: input.content,
      });

      return this.mapCommentToDto(comment, task.pubId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to create task comment: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to create task comment');
    }
  }

  async updateTaskComment(
    pubId: string,
    userId: number,
    input: UpdateTaskCommentInput,
  ): Promise<TaskCommentResponseDto> {
    try {
      const comment = await TaskHelper.findCommentByPubId(this.prisma, pubId);
      if (!comment) throw new NotFoundException('Comment not found');

      if (comment.authorId !== userId) {
        throw new ForbiddenException(
          'You can only edit comments written by yourself',
        );
      }

      const updated = await TaskHelper.updateTaskComment(
        this.prisma,
        comment.id,
        input.content,
      );
      if (!updated) throw new NotFoundException('Comment not found after update');

      const task = await TaskHelper.findTaskById(this.prisma, comment.taskId);
      return this.mapCommentToDto(updated, task?.pubId ?? '');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update task comment: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to update task comment');
    }
  }

  async deleteTaskComment(
    pubId: string,
    userId: number,
  ): Promise<TaskActionResponseDto> {
    try {
      const comment = await TaskHelper.findCommentByPubId(this.prisma, pubId);
      if (!comment) throw new NotFoundException('Comment not found');

      const task = await TaskHelper.findTaskById(this.prisma, comment.taskId);
      if (!task) throw new NotFoundException('Task not found');
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      const member = await this.ensureOrgMember(project.organizationId, userId);
      const isElevated =
        member.role === OrganizationRole.OWNER ||
        member.role === OrganizationRole.ADMIN ||
        comment.authorId === userId;

      if (!isElevated) {
        throw new ForbiddenException(
          'You do not have permission to delete this comment',
        );
      }

      await TaskHelper.deleteTaskComment(this.prisma, comment.id);
      return {
        success: true,
        message: `Comment '${pubId}' has been deleted`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to delete task comment: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to delete task comment');
    }
  }

  async listTaskComments(
    taskPubId: string,
    userId: number,
  ): Promise<TaskCommentResponseDto[]> {
    try {
      const task = await this.resolveTask(taskPubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      const comments = await TaskHelper.listCommentsByTask(
        this.prisma,
        task.id,
      );
      return comments.map((c) => this.mapCommentToDto(c, task.pubId));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to list task comments: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to list task comments');
    }
  }

  // ==========================================
  // TASK DEPENDENCY OPERATIONS
  // ==========================================

  async addTaskDependency(
    userId: number,
    input: AddTaskDependencyInput,
  ): Promise<TaskDependencyResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const dependsOnTask = await this.resolveTask(input.dependsOnTaskPubId);

      if (task.id === dependsOnTask.id) {
        throw new BadRequestException('A task cannot depend on itself');
      }

      if (task.projectId !== dependsOnTask.projectId) {
        throw new BadRequestException(
          'Tasks in a dependency relationship must belong to the same project',
        );
      }

      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      // Check reverse dependency to avoid direct cycles (A -> B -> A)
      const reverse = await TaskHelper.findTaskDependency(
        this.prisma,
        dependsOnTask.id,
        task.id,
      );
      if (reverse) {
        throw new ConflictException(
          'Cannot add dependency: circular dependency detected',
        );
      }

      const record = await TaskHelper.addTaskDependency(
        this.prisma,
        task.id,
        dependsOnTask.id,
        input.type ?? DependencyType.BLOCKS,
      );

      return {
        id: record.id,
        pubId: record.pubId,
        taskPubId: task.pubId,
        dependsOnTaskPubId: dependsOnTask.pubId,
        type: record.type,
        createdAt: new Date(record.createdAt),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to add task dependency: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to add task dependency');
    }
  }

  async removeTaskDependency(
    userId: number,
    input: RemoveTaskDependencyInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const task = await this.resolveTask(input.taskPubId);
      const dependsOnTask = await this.resolveTask(input.dependsOnTaskPubId);

      const project = await ProjectHelper.findProjectById(
        this.prisma,
        task.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      await TaskHelper.removeTaskDependency(
        this.prisma,
        task.id,
        dependsOnTask.id,
      );
      return {
        success: true,
        message: `Dependency between '${task.pubId}' and '${dependsOnTask.pubId}' removed`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove task dependency: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to remove task dependency',
      );
    }
  }

  // ==========================================
  // SPRINT OPERATIONS
  // ==========================================

  async createSprint(
    userId: number,
    input: CreateSprintInput,
  ): Promise<SprintResponseDto> {
    try {
      const project = await this.resolveProject(input.projectPubId);
      await this.ensureCanManageProjectTasks(project.organizationId, userId);

      if (new Date(input.endDate) <= new Date(input.startDate)) {
        throw new BadRequestException('Sprint end date must be after start date');
      }

      const sprint = await TaskHelper.createSprint(this.prisma, {
        projectId: project.id,
        name: input.name,
        goal: input.goal,
        status: input.status ?? SprintStatus.PLANNED,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return this.mapSprintToDto(sprint);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create sprint: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to create sprint');
    }
  }

  async updateSprint(
    pubId: string,
    userId: number,
    input: UpdateSprintInput,
  ): Promise<SprintResponseDto> {
    try {
      const sprint = await this.resolveSprint(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        sprint.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureCanManageProjectTasks(project.organizationId, userId);

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(sprint.startDate);
      const endDate = input.endDate
        ? new Date(input.endDate)
        : new Date(sprint.endDate);

      if (endDate <= startDate) {
        throw new BadRequestException('Sprint end date must be after start date');
      }

      const updated = await TaskHelper.updateSprint(
        this.prisma,
        sprint.id,
        input,
      );
      if (!updated) throw new NotFoundException('Sprint not found after update');

      return this.mapSprintToDto(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update sprint: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to update sprint');
    }
  }

  async deleteSprint(
    pubId: string,
    userId: number,
  ): Promise<DeleteSprintResponseDto> {
    try {
      const sprint = await this.resolveSprint(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        sprint.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      const member = await this.ensureOrgMember(project.organizationId, userId);
      const isOwnerOrAdmin =
        member.role === OrganizationRole.OWNER ||
        member.role === OrganizationRole.ADMIN;

      if (!isOwnerOrAdmin) {
        throw new ForbiddenException(
          'Only organization admins can delete sprints',
        );
      }

      await TaskHelper.deleteSprint(this.prisma, sprint.id);
      return {
        success: true,
        message: `Sprint '${pubId}' has been deleted`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete sprint: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to delete sprint');
    }
  }

  async getSprint(pubId: string, userId: number): Promise<SprintResponseDto> {
    try {
      const sprint = await this.resolveSprint(pubId);
      const project = await ProjectHelper.findProjectById(
        this.prisma,
        sprint.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);
      return this.mapSprintToDto(sprint);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get sprint: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to get sprint');
    }
  }

  async listProjectSprints(
    projectPubId: string,
    userId: number,
    status?: SprintStatus,
  ): Promise<SprintResponseDto[]> {
    try {
      const project = await this.resolveProject(projectPubId);
      await this.ensureOrgMember(project.organizationId, userId);

      const sprints = await TaskHelper.listSprintsByProject(
        this.prisma,
        project.id,
        status,
      );
      return sprints.map((s) => this.mapSprintToDto(s));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to list project sprints: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to list project sprints');
    }
  }

  async addTaskToSprint(
    userId: number,
    input: AddSprintTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const sprint = await this.resolveSprint(input.sprintPubId);
      const task = await this.resolveTask(input.taskPubId);

      if (sprint.projectId !== task.projectId) {
        throw new BadRequestException(
          'Task and sprint must belong to the same project',
        );
      }

      const project = await ProjectHelper.findProjectById(
        this.prisma,
        sprint.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      await TaskHelper.addTaskToSprint(this.prisma, sprint.id, task.id);
      return {
        success: true,
        message: `Task '${task.pubId}' added to sprint '${sprint.name}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to add task to sprint: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to add task to sprint');
    }
  }

  async removeTaskFromSprint(
    userId: number,
    input: RemoveSprintTaskInput,
  ): Promise<TaskActionResponseDto> {
    try {
      const sprint = await this.resolveSprint(input.sprintPubId);
      const task = await this.resolveTask(input.taskPubId);

      const project = await ProjectHelper.findProjectById(
        this.prisma,
        sprint.projectId,
      );
      if (!project) throw new NotFoundException('Project not found');

      await this.ensureOrgMember(project.organizationId, userId);

      await TaskHelper.removeTaskFromSprint(this.prisma, sprint.id, task.id);
      return {
        success: true,
        message: `Task '${task.pubId}' removed from sprint '${sprint.name}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove task from sprint: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to remove task from sprint',
      );
    }
  }

  // ==========================================
  // DTO MAPPERS
  // ==========================================

  private mapTaskToDto(task: TaskWithDetails): TaskResponseDto {
    return {
      id: task.id,
      pubId: task.pubId,
      projectPubId: task.project?.pubId ?? '',
      project: task.project ? (task.project as unknown as ProjectResponseDto) : undefined,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      priority: task.priority,
      position: task.position,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      parentTaskPubId: task.parentTask?.pubId ?? undefined,
      creator: task.creator
        ? (this.mapUserToDto(task.creator) as UserResponseDto)
        : undefined,
      assignees: (task.assignees || []).map((a) => ({
        pubId: a.pubId,
        taskPubId: task.pubId,
        user: a.user ? this.mapUserToDto(a.user) : undefined,
        assignedAt: new Date(a.assignedAt),
      })),
      labels: (task.labels || []).map((l) => ({
        id: l.id,
        pubId: l.pubId,
        organizationPubId: '',
        name: l.name,
        color: l.color,
      })),
      comments: (task.comments || []).map((c) => this.mapCommentToDto(c, task.pubId)),
      dependencies: (task.dependencies || []).map((d) => ({
        id: d.id,
        pubId: d.pubId,
        taskPubId: task.pubId,
        dependsOnTaskPubId: d.dependsOnTask?.pubId ?? '',
        type: d.type,
        createdAt: new Date(d.createdAt),
      })),
      blockedBy: (task.blockedBy || []).map((d) => ({
        id: d.id,
        pubId: d.pubId,
        taskPubId: d.task?.pubId ?? '',
        dependsOnTaskPubId: task.pubId,
        type: d.type,
        createdAt: new Date(d.createdAt),
      })),
      subTasks: (task.subTasks || []).map((st) => ({
        id: st.id,
        pubId: st.pubId,
        projectPubId: task.project?.pubId ?? '',
        title: st.title,
        description: st.description ?? undefined,
        status: st.status,
        priority: st.priority,
        position: st.position,
        dueDate: st.dueDate ? new Date(st.dueDate) : undefined,
        parentTaskPubId: task.pubId,
        createdAt: new Date(st.createdAt),
        updatedAt: new Date(st.updatedAt),
      })),
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
    };
  }

  private mapSprintToDto(sprint: SprintWithDetails): SprintResponseDto {
    return {
      id: sprint.id,
      pubId: sprint.pubId,
      projectPubId: sprint.project?.pubId ?? '',
      project: sprint.project
        ? (sprint.project as unknown as ProjectResponseDto)
        : undefined,
      name: sprint.name,
      goal: sprint.goal ?? undefined,
      status: sprint.status,
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate),
      taskCount: sprint.taskCount,
      tasks: (sprint.tasks || []).map((t) => this.mapTaskToDto(t)),
      createdAt: new Date(sprint.createdAt),
      updatedAt: new Date(sprint.updatedAt),
    };
  }

  private mapLabelToDto(
    label: PrismaLabelRecord,
    organizationPubId: string,
  ): LabelResponseDto {
    return {
      id: label.id,
      pubId: label.pubId,
      organizationPubId,
      name: label.name,
      color: label.color,
    };
  }

  private mapCommentToDto(
    comment: TaskCommentWithAuthor,
    taskPubId: string,
  ): TaskCommentResponseDto {
    return {
      id: comment.id,
      pubId: comment.pubId,
      taskPubId,
      author: comment.author ? this.mapUserToDto(comment.author) : undefined,
      content: comment.content,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    };
  }

  private mapUserToDto(user?: PrismaUserRecord | null): UserResponseDto {
    if (!user) {
      return {
        pubId: '',
        email: '',
        firstName: null,
        lastName: null,
        fullName: 'Unknown User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return {
      pubId: user.pubId,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }
}
