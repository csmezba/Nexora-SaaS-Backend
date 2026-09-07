import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TaskResolver } from '../../../src/task/task.resolver.js';
import { TaskService } from '../../../src/task/task.service.js';
import { TaskStatus } from '../../../src/task/enums/task-status.enum.js';
import { TaskPriority } from '../../../src/task/enums/task-priority.enum.js';
import { SprintStatus } from '../../../src/task/enums/sprint-status.enum.js';
import { DependencyType } from '../../../src/task/enums/dependency-type.enum.js';

describe('TaskResolver', () => {
  let resolver: TaskResolver;
  let service: TaskService;

  const sampleTaskDto = {
    id: 50,
    pubId: 'tsk_test1234567',
    projectPubId: 'prj_test1234567',
    title: 'Implement Multi-Tenant JWT Auth',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    position: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleSprintDto = {
    id: 300,
    pubId: 'spn_test1234567',
    projectPubId: 'prj_test1234567',
    name: 'Sprint 1',
    status: SprintStatus.PLANNED,
    startDate: new Date(),
    endDate: new Date(),
    taskCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleLabelDto = {
    id: 200,
    pubId: 'lbl_test1234567',
    organizationPubId: 'org_test1234567',
    name: 'Bug',
    color: '#EF4444',
  };

  const sampleCommentDto = {
    id: 400,
    pubId: 'tcm_test1234567',
    taskPubId: 'tsk_test1234567',
    content: 'Review needed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = {
      getTask: vi.fn(),
      listProjectTasks: vi.fn(),
      listUserTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      updateTaskPosition: vi.fn(),
      deleteTask: vi.fn(),
      assignTask: vi.fn(),
      unassignTask: vi.fn(),
      organizationLabels: vi.fn(),
      listOrganizationLabels: vi.fn(),
      createLabel: vi.fn(),
      updateLabel: vi.fn(),
      deleteLabel: vi.fn(),
      addLabelToTask: vi.fn(),
      removeLabelFromTask: vi.fn(),
      listTaskComments: vi.fn(),
      createTaskComment: vi.fn(),
      updateTaskComment: vi.fn(),
      deleteTaskComment: vi.fn(),
      addTaskDependency: vi.fn(),
      removeTaskDependency: vi.fn(),
      getSprint: vi.fn(),
      listProjectSprints: vi.fn(),
      createSprint: vi.fn(),
      updateSprint: vi.fn(),
      deleteSprint: vi.fn(),
      addTaskToSprint: vi.fn(),
      removeTaskFromSprint: vi.fn(),
    } as unknown as TaskService;

    resolver = new TaskResolver(service);
  });

  it('should call service.getTask on task query', async () => {
    vi.mocked(service.getTask).mockResolvedValue(sampleTaskDto as any);
    const result = await resolver.task('tsk_test1234567', 10);
    expect(result).toEqual(sampleTaskDto);
    expect(service.getTask).toHaveBeenCalledWith('tsk_test1234567', 10);
  });

  it('should call service.listProjectTasks on projectTasks query', async () => {
    vi.mocked(service.listProjectTasks).mockResolvedValue([
      sampleTaskDto as any,
    ]);
    const result = await resolver.projectTasks('prj_test1234567', 10);
    expect(result).toEqual([sampleTaskDto]);
    expect(service.listProjectTasks).toHaveBeenCalledWith(
      'prj_test1234567',
      10,
      { status: undefined, priority: undefined, sprintPubId: undefined },
    );
  });

  it('should call service.createTask on createTask mutation', async () => {
    vi.mocked(service.createTask).mockResolvedValue(sampleTaskDto as any);
    const input = {
      projectPubId: 'prj_test1234567',
      title: 'Implement Multi-Tenant JWT Auth',
    };
    const result = await resolver.createTask(10, input as any);
    expect(result).toEqual(sampleTaskDto);
    expect(service.createTask).toHaveBeenCalledWith(10, input);
  });

  it('should call service.createSprint on createSprint mutation', async () => {
    vi.mocked(service.createSprint).mockResolvedValue(sampleSprintDto as any);
    const input = {
      projectPubId: 'prj_test1234567',
      name: 'Sprint 1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-15'),
    };
    const result = await resolver.createSprint(10, input as any);
    expect(result).toEqual(sampleSprintDto);
    expect(service.createSprint).toHaveBeenCalledWith(10, input);
  });

  it('should call service.createLabel on createLabel mutation', async () => {
    vi.mocked(service.createLabel).mockResolvedValue(sampleLabelDto as any);
    const input = {
      organizationPubId: 'org_test1234567',
      name: 'Bug',
      color: '#EF4444',
    };
    const result = await resolver.createLabel(10, input as any);
    expect(result).toEqual(sampleLabelDto);
    expect(service.createLabel).toHaveBeenCalledWith(10, input);
  });

  it('should call service.createTaskComment on createTaskComment mutation', async () => {
    vi.mocked(service.createTaskComment).mockResolvedValue(
      sampleCommentDto as any,
    );
    const input = {
      taskPubId: 'tsk_test1234567',
      content: 'Review needed',
    };
    const result = await resolver.createTaskComment(10, input as any);
    expect(result).toEqual(sampleCommentDto);
    expect(service.createTaskComment).toHaveBeenCalledWith(10, input);
  });

  it('should call service.addTaskDependency on addTaskDependency mutation', async () => {
    const depDto = {
      id: 1,
      pubId: 'tdp_test1234567',
      taskPubId: 'tsk_test1234567',
      dependsOnTaskPubId: 'tsk_target12345',
      type: DependencyType.BLOCKS,
      createdAt: new Date(),
    };
    vi.mocked(service.addTaskDependency).mockResolvedValue(depDto as any);
    const input = {
      taskPubId: 'tsk_test1234567',
      dependsOnTaskPubId: 'tsk_target12345',
    };
    const result = await resolver.addTaskDependency(10, input as any);
    expect(result).toEqual(depDto);
    expect(service.addTaskDependency).toHaveBeenCalledWith(10, input);
  });
});
