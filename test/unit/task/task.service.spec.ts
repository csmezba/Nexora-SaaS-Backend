import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskService } from '../../../src/task/task.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';
import { TaskStatus } from '../../../src/task/enums/task-status.enum.js';
import { TaskPriority } from '../../../src/task/enums/task-priority.enum.js';
import { DependencyType } from '../../../src/task/enums/dependency-type.enum.js';
import { SprintStatus } from '../../../src/task/enums/sprint-status.enum.js';
import { ProjectStatus } from '../../../src/project/enums/project-status.enum.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import * as UserHelper from '../../../src/user/user.helper.js';
import * as ProjectHelper from '../../../src/project/project.helper.js';
import * as TaskHelper from '../../../src/task/task.helper.js';

vi.mock('../../../src/organization/organization.helper.js', () => ({
  findByPubIdOrSlug: vi.fn(),
  findByOrgAndUser: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../../../src/user/user.helper.js', () => ({
  findUserById: vi.fn(),
  findUserByPubId: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock('../../../src/project/project.helper.js', () => ({
  findProjectById: vi.fn(),
  findProjectByPubId: vi.fn(),
}));

vi.mock('../../../src/task/task.helper.js', () => ({
  findTaskById: vi.fn(),
  findTaskByPubId: vi.fn(),
  listTasksByProject: vi.fn(),
  listTasksByAssignee: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  updateTaskPosition: vi.fn(),
  deleteTask: vi.fn(),
  findTaskAssignee: vi.fn(),
  assignUserToTask: vi.fn(),
  unassignUserFromTask: vi.fn(),
  findLabelById: vi.fn(),
  findLabelByPubId: vi.fn(),
  findLabelByNameAndOrg: vi.fn(),
  listLabelsByOrg: vi.fn(),
  createLabel: vi.fn(),
  updateLabel: vi.fn(),
  deleteLabel: vi.fn(),
  addLabelToTask: vi.fn(),
  removeLabelFromTask: vi.fn(),
  findCommentById: vi.fn(),
  findCommentByPubId: vi.fn(),
  listCommentsByTask: vi.fn(),
  createTaskComment: vi.fn(),
  updateTaskComment: vi.fn(),
  deleteTaskComment: vi.fn(),
  findTaskDependency: vi.fn(),
  addTaskDependency: vi.fn(),
  removeTaskDependency: vi.fn(),
  findSprintById: vi.fn(),
  findSprintByPubId: vi.fn(),
  listSprintsByProject: vi.fn(),
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
  deleteSprint: vi.fn(),
  addTaskToSprint: vi.fn(),
  removeTaskFromSprint: vi.fn(),
  listSprintTasks: vi.fn(),
}));

describe('TaskService', () => {
  let service: TaskService;
  let mockPrisma: PrismaService;

  const sampleOrg = {
    id: 1,
    pubId: 'org_test1234567',
    name: 'Test Org',
    slug: 'test-org',
  };

  const sampleMember = {
    id: 1,
    pubId: 'mem_12345678901',
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.ADMIN,
  };

  const sampleProject = {
    id: 100,
    pubId: 'prj_test1234567',
    organizationId: 1,
    name: 'Platform Core',
    key: 'NEX',
    status: ProjectStatus.ACTIVE,
  };

  const sampleTask = {
    id: 50,
    pubId: 'tsk_test1234567',
    projectId: 100,
    createdById: 10,
    parentTaskId: null,
    title: 'Implement Auth',
    description: 'JWT tokens',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    position: 0,
    dueDate: '2026-06-01T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    assignees: [],
    labels: [],
    comments: [],
    dependencies: [],
    blockedBy: [],
    subTasks: [],
    sprints: [],
  };

  const sampleLabel = {
    id: 200,
    pubId: 'lbl_test1234567',
    organizationId: 1,
    name: 'Bug',
    color: '#EF4444',
  };

  const sampleSprint = {
    id: 300,
    pubId: 'spn_test1234567',
    projectId: 100,
    name: 'Sprint 1',
    goal: 'MVP',
    status: SprintStatus.PLANNED,
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-15T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    taskCount: 0,
    tasks: [],
  };

  const sampleComment = {
    id: 400,
    pubId: 'tcm_test1234567',
    taskId: 50,
    authorId: 10,
    content: 'Looking good!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as PrismaService;
    service = new TaskService(mockPrisma);
  });

  describe('createTask', () => {
    it('should create a task within a project', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.createTask).mockResolvedValue(sampleTask as any);
      vi.mocked(TaskHelper.findTaskById).mockResolvedValue(sampleTask as any);

      const result = await service.createTask(10, {
        projectPubId: 'prj_test1234567',
        title: 'Implement Auth',
        description: 'JWT tokens',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });

      expect(result.pubId).toBe('tsk_test1234567');
      expect(result.title).toBe('Implement Auth');
      expect(TaskHelper.createTask).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user cannot manage tasks', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue({
        ...sampleMember,
        role: OrganizationRole.VIEWER,
      } as any);

      await expect(
        service.createTask(10, {
          projectPubId: 'prj_test1234567',
          title: 'Unauthorized Task',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTask', () => {
    it('should update task details', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.updateTask).mockResolvedValue({
        ...sampleTask,
        title: 'Updated Auth',
      } as any);

      const result = await service.updateTask('tsk_test1234567', 10, {
        title: 'Updated Auth',
      });

      expect(result.title).toBe('Updated Auth');
    });

    it('should reject setting task as its own parent', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );

      await expect(
        service.updateTask('tsk_test1234567', 10, {
          parentTaskPubId: 'tsk_test1234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTaskPosition', () => {
    it('should update position and status column', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.updateTaskPosition).mockResolvedValue({
        ...sampleTask,
        position: 15,
        status: TaskStatus.IN_PROGRESS,
      } as any);

      const result = await service.updateTaskPosition(10, {
        taskPubId: 'tsk_test1234567',
        position: 15,
        status: TaskStatus.IN_PROGRESS,
      });

      expect(result.position).toBe(15);
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('deleteTask', () => {
    it('should delete task when requested by admin or creator', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.deleteTask).mockResolvedValue(true);

      const result = await service.deleteTask('tsk_test1234567', 10);
      expect(result.success).toBe(true);
    });
  });

  describe('assignTask & unassignTask', () => {
    it('should assign a user to a task', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue({
        id: 20,
        email: 'dev@nexora.app',
      } as any);
      vi.mocked(TaskHelper.assignUserToTask).mockResolvedValue({} as any);

      const result = await service.assignTask(10, {
        taskPubId: 'tsk_test1234567',
        userPubId: 'usr_dev12345678',
      });

      expect(result.success).toBe(true);
      expect(TaskHelper.assignUserToTask).toHaveBeenCalledWith(
        mockPrisma,
        50,
        20,
      );
    });

    it('should unassign a user from a task', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue({
        id: 20,
        email: 'dev@nexora.app',
      } as any);
      vi.mocked(TaskHelper.unassignUserFromTask).mockResolvedValue(true);

      const result = await service.unassignTask(10, {
        taskPubId: 'tsk_test1234567',
        userPubId: 'usr_dev12345678',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Label Operations', () => {
    it('should create an organization label', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(
        sampleOrg as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.findLabelByNameAndOrg).mockResolvedValue(null);
      vi.mocked(TaskHelper.createLabel).mockResolvedValue(sampleLabel as any);

      const result = await service.createLabel(10, {
        organizationPubId: 'org_test1234567',
        name: 'Bug',
        color: '#EF4444',
      });

      expect(result.name).toBe('Bug');
      expect(result.color).toBe('#EF4444');
    });

    it('should throw ConflictException if label already exists', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(
        sampleOrg as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.findLabelByNameAndOrg).mockResolvedValue(
        sampleLabel as any,
      );

      await expect(
        service.createLabel(10, {
          organizationPubId: 'org_test1234567',
          name: 'Bug',
          color: '#EF4444',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should attach label to a task', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.findLabelByPubId).mockResolvedValue(
        sampleLabel as any,
      );
      vi.mocked(TaskHelper.addLabelToTask).mockResolvedValue({} as any);

      const result = await service.addLabelToTask(10, {
        taskPubId: 'tsk_test1234567',
        labelPubId: 'lbl_test1234567',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Task Comment Operations', () => {
    it('should create a comment on a task', async () => {
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.createTaskComment).mockResolvedValue(
        sampleComment as any,
      );

      const result = await service.createTaskComment(10, {
        taskPubId: 'tsk_test1234567',
        content: 'Looking good!',
      });

      expect(result.content).toBe('Looking good!');
    });

    it('should prevent updating comments created by another user', async () => {
      vi.mocked(TaskHelper.findCommentByPubId).mockResolvedValue({
        ...sampleComment,
        authorId: 99,
      } as any);

      await expect(
        service.updateTaskComment('tcm_test1234567', 10, {
          content: 'Hacked comment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Task Dependency Operations', () => {
    it('should add dependency between tasks', async () => {
      vi.mocked(TaskHelper.findTaskByPubId)
        .mockResolvedValueOnce(sampleTask as any)
        .mockResolvedValueOnce({
          ...sampleTask,
          id: 51,
          pubId: 'tsk_dep12345678',
        } as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.findTaskDependency).mockResolvedValue(null);
      vi.mocked(TaskHelper.addTaskDependency).mockResolvedValue({
        id: 1,
        pubId: 'tdp_test1234567',
        taskId: 50,
        dependsOnTaskId: 51,
        type: DependencyType.BLOCKS,
        createdAt: new Date().toISOString(),
      } as any);

      const result = await service.addTaskDependency(10, {
        taskPubId: 'tsk_test1234567',
        dependsOnTaskPubId: 'tsk_dep12345678',
      });

      expect(result.pubId).toBe('tdp_test1234567');
      expect(result.type).toBe(DependencyType.BLOCKS);
    });

    it('should reject circular dependency', async () => {
      vi.mocked(TaskHelper.findTaskByPubId)
        .mockResolvedValueOnce(sampleTask as any)
        .mockResolvedValueOnce({
          ...sampleTask,
          id: 51,
          pubId: 'tsk_dep12345678',
        } as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.findTaskDependency).mockResolvedValue({
        id: 9,
      } as any);

      await expect(
        service.addTaskDependency(10, {
          taskPubId: 'tsk_test1234567',
          dependsOnTaskPubId: 'tsk_dep12345678',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Sprint Operations', () => {
    it('should create a sprint for a project', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.createSprint).mockResolvedValue(sampleSprint as any);

      const result = await service.createSprint(10, {
        projectPubId: 'prj_test1234567',
        name: 'Sprint 1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-15'),
      });

      expect(result.name).toBe('Sprint 1');
      expect(result.status).toBe(SprintStatus.PLANNED);
    });

    it('should reject sprint when end date is before start date', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );

      await expect(
        service.createSprint(10, {
          projectPubId: 'prj_test1234567',
          name: 'Invalid Sprint',
          startDate: new Date('2026-06-15'),
          endDate: new Date('2026-06-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add a task to a sprint', async () => {
      vi.mocked(TaskHelper.findSprintByPubId).mockResolvedValue(
        sampleSprint as any,
      );
      vi.mocked(TaskHelper.findTaskByPubId).mockResolvedValue(sampleTask as any);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(
        sampleProject as any,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(
        sampleMember as any,
      );
      vi.mocked(TaskHelper.addTaskToSprint).mockResolvedValue({} as any);

      const result = await service.addTaskToSprint(10, {
        sprintPubId: 'spn_test1234567',
        taskPubId: 'tsk_test1234567',
      });

      expect(result.success).toBe(true);
    });
  });
});
