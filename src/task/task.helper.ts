import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import * as UserHelper from '../user/user.helper.js';
import * as ProjectHelper from '../project/project.helper.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';
import { DependencyType } from './enums/dependency-type.enum.js';
import { SprintStatus } from './enums/sprint-status.enum.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  CreateLabelData,
  CreateSprintData,
  CreateTaskCommentData,
  CreateTaskData,
  PrismaLabelRecord,
  PrismaSprintRecord,
  PrismaSprintTaskRecord,
  PrismaTaskAssigneeRecord,
  PrismaTaskCommentRecord,
  PrismaTaskDependencyRecord,
  PrismaTaskLabelRecord,
  PrismaTaskRecord,
  SprintWithDetails,
  TaskAssigneeWithUser,
  TaskCommentWithAuthor,
  TaskDependencyWithTask,
  TaskWithDetails,
  UpdateLabelData,
  UpdateSprintData,
  UpdateTaskData,
} from './types/task.types.js';

// --- Model Accessors ---

function getModel<T>(prisma: PrismaService, name: string): PrismaOrmModel<T> {
  const orm = prisma.db.orm as unknown as Record<string, PrismaOrmModel<T>>;
  const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
  return (
    orm[name] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<T>>)?.[name] ||
    orm[lowerName]!
  );
}

export function getTaskModel(prisma: PrismaService): PrismaOrmModel<PrismaTaskRecord> {
  return getModel<PrismaTaskRecord>(prisma, 'Task');
}

export function getTaskAssigneeModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTaskAssigneeRecord> {
  return getModel<PrismaTaskAssigneeRecord>(prisma, 'TaskAssignee');
}

export function getLabelModel(prisma: PrismaService): PrismaOrmModel<PrismaLabelRecord> {
  return getModel<PrismaLabelRecord>(prisma, 'Label');
}

export function getTaskLabelModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTaskLabelRecord> {
  return getModel<PrismaTaskLabelRecord>(prisma, 'TaskLabel');
}

export function getTaskCommentModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTaskCommentRecord> {
  return getModel<PrismaTaskCommentRecord>(prisma, 'TaskComment');
}

export function getTaskDependencyModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTaskDependencyRecord> {
  return getModel<PrismaTaskDependencyRecord>(prisma, 'TaskDependency');
}

export function getSprintModel(prisma: PrismaService): PrismaOrmModel<PrismaSprintRecord> {
  return getModel<PrismaSprintRecord>(prisma, 'Sprint');
}

export function getSprintTaskModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaSprintTaskRecord> {
  return getModel<PrismaSprintTaskRecord>(prisma, 'SprintTask');
}

// ==========================================
// TASK OPERATIONS
// ==========================================

export async function findTaskById(
  prisma: PrismaService,
  id: number,
): Promise<TaskWithDetails | null> {
  const taskModel = getTaskModel(prisma);
  const record = await taskModel.first({ id });
  if (!record || record.deletedAt) return null;
  return hydrateTask(prisma, record);
}

export async function findTaskByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<TaskWithDetails | null> {
  const taskModel = getTaskModel(prisma);
  const record = await taskModel
    .where((t: { pubId: { eq: (val: string) => unknown } }) =>
      t.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record || record.deletedAt) return null;
  return hydrateTask(prisma, record);
}

export async function listTasksByProject(
  prisma: PrismaService,
  projectId: number,
  filters?: { status?: TaskStatus; priority?: TaskPriority },
): Promise<TaskWithDetails[]> {
  const taskModel = getTaskModel(prisma);
  const records = await taskModel
    .where((t: { projectId: { eq: (val: number) => unknown } }) =>
      t.projectId.eq(projectId),
    )
    .all();

  const filtered = (records || []).filter((r) => {
    if (r.deletedAt) return false;
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.priority && r.priority !== filters.priority) return false;
    return true;
  });

  const results: TaskWithDetails[] = [];
  for (const record of filtered) {
    const hydrated = await hydrateTask(prisma, record);
    results.push(hydrated);
  }
  return results.sort((a, b) => a.position - b.position);
}

export async function listTasksByAssignee(
  prisma: PrismaService,
  userId: number,
  filters?: { status?: TaskStatus },
): Promise<TaskWithDetails[]> {
  const assigneeModel = getTaskAssigneeModel(prisma);
  const assignments = await assigneeModel
    .where((a: { userId: { eq: (val: number) => unknown } }) =>
      a.userId.eq(userId),
    )
    .all();

  const results: TaskWithDetails[] = [];
  for (const item of assignments || []) {
    const task = await findTaskById(prisma, item.taskId);
    if (task) {
      if (filters?.status && task.status !== filters.status) continue;
      results.push(task);
    }
  }
  return results;
}

export async function listSubTasks(
  prisma: PrismaService,
  parentTaskId: number,
): Promise<PrismaTaskRecord[]> {
  const taskModel = getTaskModel(prisma);
  const records = await taskModel
    .where((t: { parentTaskId: { eq: (val: number) => unknown } }) =>
      t.parentTaskId.eq(parentTaskId),
    )
    .all();

  return (records || []).filter((r) => !r.deletedAt);
}

export async function createTask(
  prisma: PrismaService,
  data: CreateTaskData,
): Promise<TaskWithDetails> {
  const taskModel = getTaskModel(prisma);
  const now = new Date().toISOString();
  const record = await taskModel.create({
    pubId: data.pubId ?? generatePubId('tsk'),
    projectId: data.projectId,
    createdById: data.createdById,
    parentTaskId: data.parentTaskId ?? null,
    title: data.title.trim(),
    description: data.description ?? null,
    status: data.status ?? TaskStatus.TODO,
    priority: data.priority ?? TaskPriority.MEDIUM,
    position: data.position ?? 0,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  return hydrateTask(prisma, record);
}

export async function updateTask(
  prisma: PrismaService,
  id: number,
  data: UpdateTaskData,
): Promise<TaskWithDetails | null> {
  const taskModel = getTaskModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updatePayload['title'] = data.title.trim();
  if (data.description !== undefined) updatePayload['description'] = data.description;
  if (data.status !== undefined) updatePayload['status'] = data.status;
  if (data.priority !== undefined) updatePayload['priority'] = data.priority;
  if (data.position !== undefined) updatePayload['position'] = data.position;
  if (data.dueDate !== undefined)
    updatePayload['dueDate'] = data.dueDate
      ? new Date(data.dueDate).toISOString()
      : null;
  if (data.parentTaskId !== undefined)
    updatePayload['parentTaskId'] = data.parentTaskId;

  await taskModel.where({ id }).update(updatePayload);
  return findTaskById(prisma, id);
}

export async function updateTaskPosition(
  prisma: PrismaService,
  id: number,
  position: number,
  status?: TaskStatus,
): Promise<TaskWithDetails | null> {
  const taskModel = getTaskModel(prisma);
  const payload: Record<string, unknown> = {
    position,
    updatedAt: new Date().toISOString(),
  };
  if (status !== undefined) {
    payload['status'] = status;
  }
  await taskModel.where({ id }).update(payload);
  return findTaskById(prisma, id);
}

export async function deleteTask(
  prisma: PrismaService,
  id: number,
  hardDelete = false,
): Promise<boolean> {
  const taskModel = getTaskModel(prisma);
  if (hardDelete) {
    await taskModel.where({ id }).delete();
  } else {
    await taskModel.where({ id }).update({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return true;
}

// ==========================================
// TASK ASSIGNEE OPERATIONS
// ==========================================

export async function findTaskAssignee(
  prisma: PrismaService,
  taskId: number,
  userId: number,
): Promise<PrismaTaskAssigneeRecord | null> {
  const assigneeModel = getTaskAssigneeModel(prisma);
  const records = await assigneeModel
    .where((a: { taskId: { eq: (val: number) => unknown } }) =>
      a.taskId.eq(taskId),
    )
    .all();

  return (records || []).find((r) => r.userId === userId) ?? null;
}

export async function listTaskAssignees(
  prisma: PrismaService,
  taskId: number,
): Promise<TaskAssigneeWithUser[]> {
  const assigneeModel = getTaskAssigneeModel(prisma);
  const records = await assigneeModel
    .where((a: { taskId: { eq: (val: number) => unknown } }) =>
      a.taskId.eq(taskId),
    )
    .all();

  const results: TaskAssigneeWithUser[] = [];
  for (const record of records || []) {
    const user = await UserHelper.findUserById(prisma, record.userId);
    results.push({
      ...record,
      user: user ?? undefined,
    });
  }
  return results;
}

export async function assignUserToTask(
  prisma: PrismaService,
  taskId: number,
  userId: number,
  pubId?: string,
): Promise<PrismaTaskAssigneeRecord> {
  const assigneeModel = getTaskAssigneeModel(prisma);
  const existing = await findTaskAssignee(prisma, taskId, userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  return assigneeModel.create({
    pubId: pubId ?? generatePubId('tsa'),
    taskId,
    userId,
    assignedAt: now,
  });
}

export async function unassignUserFromTask(
  prisma: PrismaService,
  taskId: number,
  userId: number,
): Promise<boolean> {
  const assigneeModel = getTaskAssigneeModel(prisma);
  const records = await assigneeModel
    .where((a: { taskId: { eq: (val: number) => unknown } }) =>
      a.taskId.eq(taskId),
    )
    .all();

  const matched = (records || []).find((r) => r.userId === userId);
  if (matched) {
    await assigneeModel
      .where((a: { pubId: { eq: (val: string) => unknown } }) =>
        a.pubId.eq(matched.pubId),
      )
      .delete();
  }
  return true;
}

// ==========================================
// LABEL OPERATIONS
// ==========================================

export async function findLabelById(
  prisma: PrismaService,
  id: number,
): Promise<PrismaLabelRecord | null> {
  const labelModel = getLabelModel(prisma);
  return labelModel.first({ id });
}

export async function findLabelByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<PrismaLabelRecord | null> {
  const labelModel = getLabelModel(prisma);
  return labelModel
    .where((l: { pubId: { eq: (val: string) => unknown } }) =>
      l.pubId.eq(pubId.trim()),
    )
    .first();
}

export async function findLabelByNameAndOrg(
  prisma: PrismaService,
  organizationId: number,
  name: string,
): Promise<PrismaLabelRecord | null> {
  const labelModel = getLabelModel(prisma);
  const records = await labelModel
    .where((l: { organizationId: { eq: (val: number) => unknown } }) =>
      l.organizationId.eq(organizationId),
    )
    .all();

  const trimmed = name.trim().toLowerCase();
  return (
    (records || []).find(
      (r) => r.organizationId === organizationId && r.name.toLowerCase() === trimmed,
    ) ?? null
  );
}

export async function listLabelsByOrg(
  prisma: PrismaService,
  organizationId: number,
): Promise<PrismaLabelRecord[]> {
  const labelModel = getLabelModel(prisma);
  const records = await labelModel
    .where((l: { organizationId: { eq: (val: number) => unknown } }) =>
      l.organizationId.eq(organizationId),
    )
    .all();

  return records || [];
}

export async function createLabel(
  prisma: PrismaService,
  data: CreateLabelData,
): Promise<PrismaLabelRecord> {
  const labelModel = getLabelModel(prisma);
  return labelModel.create({
    pubId: data.pubId ?? generatePubId('lbl'),
    organizationId: data.organizationId,
    name: data.name.trim(),
    color: data.color.trim().toUpperCase(),
  });
}

export async function updateLabel(
  prisma: PrismaService,
  id: number,
  data: UpdateLabelData,
): Promise<PrismaLabelRecord | null> {
  const labelModel = getLabelModel(prisma);
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload['name'] = data.name.trim();
  if (data.color !== undefined) payload['color'] = data.color.trim().toUpperCase();

  await labelModel.where({ id }).update(payload);
  return findLabelById(prisma, id);
}

export async function deleteLabel(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const labelModel = getLabelModel(prisma);
  await labelModel.where({ id }).delete();
  return true;
}

export async function addLabelToTask(
  prisma: PrismaService,
  taskId: number,
  labelId: number,
  pubId?: string,
): Promise<PrismaTaskLabelRecord> {
  const taskLabelModel = getTaskLabelModel(prisma);
  const records = await taskLabelModel
    .where((tl: { taskId: { eq: (val: number) => unknown } }) =>
      tl.taskId.eq(taskId),
    )
    .all();

  const existing = (records || []).find((r) => r.labelId === labelId);
  if (existing) return existing;

  return taskLabelModel.create({
    pubId: pubId ?? generatePubId('tsl'),
    taskId,
    labelId,
  });
}

export async function removeLabelFromTask(
  prisma: PrismaService,
  taskId: number,
  labelId: number,
): Promise<boolean> {
  const taskLabelModel = getTaskLabelModel(prisma);
  const records = await taskLabelModel
    .where((tl: { taskId: { eq: (val: number) => unknown } }) =>
      tl.taskId.eq(taskId),
    )
    .all();

  const matched = (records || []).find((r) => r.labelId === labelId);
  if (matched) {
    await taskLabelModel
      .where((tl: { pubId: { eq: (val: string) => unknown } }) =>
        tl.pubId.eq(matched.pubId),
      )
      .delete();
  }
  return true;
}

export async function listLabelsForTask(
  prisma: PrismaService,
  taskId: number,
): Promise<PrismaLabelRecord[]> {
  const taskLabelModel = getTaskLabelModel(prisma);
  const records = await taskLabelModel
    .where((tl: { taskId: { eq: (val: number) => unknown } }) =>
      tl.taskId.eq(taskId),
    )
    .all();

  const labels: PrismaLabelRecord[] = [];
  for (const item of records || []) {
    const label = await findLabelById(prisma, item.labelId);
    if (label) labels.push(label);
  }
  return labels;
}

// ==========================================
// TASK COMMENT OPERATIONS
// ==========================================

export async function findCommentById(
  prisma: PrismaService,
  id: number,
): Promise<TaskCommentWithAuthor | null> {
  const commentModel = getTaskCommentModel(prisma);
  const record = await commentModel.first({ id });
  if (!record || record.deletedAt) return null;
  const author = await UserHelper.findUserById(prisma, record.authorId);
  return {
    ...record,
    author: author ?? undefined,
  };
}

export async function findCommentByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<TaskCommentWithAuthor | null> {
  const commentModel = getTaskCommentModel(prisma);
  const record = await commentModel
    .where((c: { pubId: { eq: (val: string) => unknown } }) =>
      c.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record || record.deletedAt) return null;
  const author = await UserHelper.findUserById(prisma, record.authorId);
  return {
    ...record,
    author: author ?? undefined,
  };
}

export async function listCommentsByTask(
  prisma: PrismaService,
  taskId: number,
): Promise<TaskCommentWithAuthor[]> {
  const commentModel = getTaskCommentModel(prisma);
  const records = await commentModel
    .where((c: { taskId: { eq: (val: number) => unknown } }) =>
      c.taskId.eq(taskId),
    )
    .all();

  const activeComments = (records || []).filter((c) => !c.deletedAt);
  const results: TaskCommentWithAuthor[] = [];
  for (const comment of activeComments) {
    const author = await UserHelper.findUserById(prisma, comment.authorId);
    results.push({
      ...comment,
      author: author ?? undefined,
    });
  }
  return results.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function createTaskComment(
  prisma: PrismaService,
  data: CreateTaskCommentData,
): Promise<TaskCommentWithAuthor> {
  const commentModel = getTaskCommentModel(prisma);
  const now = new Date().toISOString();
  const record = await commentModel.create({
    pubId: data.pubId ?? generatePubId('tcm'),
    taskId: data.taskId,
    authorId: data.authorId,
    content: data.content.trim(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const author = await UserHelper.findUserById(prisma, record.authorId);
  return {
    ...record,
    author: author ?? undefined,
  };
}

export async function updateTaskComment(
  prisma: PrismaService,
  id: number,
  content: string,
): Promise<TaskCommentWithAuthor | null> {
  const commentModel = getTaskCommentModel(prisma);
  const now = new Date().toISOString();
  await commentModel.where({ id }).update({
    content: content.trim(),
    updatedAt: now,
  });
  return findCommentById(prisma, id);
}

export async function deleteTaskComment(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const commentModel = getTaskCommentModel(prisma);
  const now = new Date().toISOString();
  await commentModel.where({ id }).update({
    deletedAt: now,
    updatedAt: now,
  });
  return true;
}

// ==========================================
// TASK DEPENDENCY OPERATIONS
// ==========================================

export async function findTaskDependency(
  prisma: PrismaService,
  taskId: number,
  dependsOnTaskId: number,
): Promise<PrismaTaskDependencyRecord | null> {
  const depModel = getTaskDependencyModel(prisma);
  const records = await depModel
    .where((d: { taskId: { eq: (val: number) => unknown } }) =>
      d.taskId.eq(taskId),
    )
    .all();

  return (
    (records || []).find((r) => r.dependsOnTaskId === dependsOnTaskId) ?? null
  );
}

export async function listDependenciesForTask(
  prisma: PrismaService,
  taskId: number,
): Promise<TaskDependencyWithTask[]> {
  const depModel = getTaskDependencyModel(prisma);
  const records = await depModel
    .where((d: { taskId: { eq: (val: number) => unknown } }) =>
      d.taskId.eq(taskId),
    )
    .all();

  const results: TaskDependencyWithTask[] = [];
  for (const record of records || []) {
    const taskModel = getTaskModel(prisma);
    const target = await taskModel.first({ id: record.dependsOnTaskId });
    if (target && !target.deletedAt) {
      results.push({
        ...record,
        dependsOnTask: target,
      });
    }
  }
  return results;
}

export async function listBlockedByForTask(
  prisma: PrismaService,
  dependsOnTaskId: number,
): Promise<TaskDependencyWithTask[]> {
  const depModel = getTaskDependencyModel(prisma);
  const records = await depModel
    .where((d: { dependsOnTaskId: { eq: (val: number) => unknown } }) =>
      d.dependsOnTaskId.eq(dependsOnTaskId),
    )
    .all();

  const results: TaskDependencyWithTask[] = [];
  for (const record of records || []) {
    const taskModel = getTaskModel(prisma);
    const source = await taskModel.first({ id: record.taskId });
    if (source && !source.deletedAt) {
      results.push({
        ...record,
        task: source,
      });
    }
  }
  return results;
}

export async function addTaskDependency(
  prisma: PrismaService,
  taskId: number,
  dependsOnTaskId: number,
  type: DependencyType = DependencyType.BLOCKS,
  pubId?: string,
): Promise<PrismaTaskDependencyRecord> {
  const depModel = getTaskDependencyModel(prisma);
  const existing = await findTaskDependency(prisma, taskId, dependsOnTaskId);
  if (existing) return existing;

  const now = new Date().toISOString();
  return depModel.create({
    pubId: pubId ?? generatePubId('tdp'),
    taskId,
    dependsOnTaskId,
    type,
    createdAt: now,
  });
}

export async function removeTaskDependency(
  prisma: PrismaService,
  taskId: number,
  dependsOnTaskId: number,
): Promise<boolean> {
  const depModel = getTaskDependencyModel(prisma);
  const records = await depModel
    .where((d: { taskId: { eq: (val: number) => unknown } }) =>
      d.taskId.eq(taskId),
    )
    .all();

  const matched = (records || []).find((r) => r.dependsOnTaskId === dependsOnTaskId);
  if (matched) {
    await depModel
      .where((d: { pubId: { eq: (val: string) => unknown } }) =>
        d.pubId.eq(matched.pubId),
      )
      .delete();
  }
  return true;
}

// ==========================================
// SPRINT OPERATIONS
// ==========================================

export async function findSprintById(
  prisma: PrismaService,
  id: number,
): Promise<SprintWithDetails | null> {
  const sprintModel = getSprintModel(prisma);
  const record = await sprintModel.first({ id });
  if (!record) return null;
  return hydrateSprint(prisma, record);
}

export async function findSprintByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<SprintWithDetails | null> {
  const sprintModel = getSprintModel(prisma);
  const record = await sprintModel
    .where((s: { pubId: { eq: (val: string) => unknown } }) =>
      s.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  return hydrateSprint(prisma, record);
}

export async function listSprintsByProject(
  prisma: PrismaService,
  projectId: number,
  status?: SprintStatus,
): Promise<SprintWithDetails[]> {
  const sprintModel = getSprintModel(prisma);
  const records = await sprintModel
    .where((s: { projectId: { eq: (val: number) => unknown } }) =>
      s.projectId.eq(projectId),
    )
    .all();

  const filtered = (records || []).filter((s) => (status ? s.status === status : true));
  const results: SprintWithDetails[] = [];
  for (const record of filtered) {
    const hydrated = await hydrateSprint(prisma, record);
    results.push(hydrated);
  }
  return results.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

export async function createSprint(
  prisma: PrismaService,
  data: CreateSprintData,
): Promise<SprintWithDetails> {
  const sprintModel = getSprintModel(prisma);
  const now = new Date().toISOString();
  const record = await sprintModel.create({
    pubId: data.pubId ?? generatePubId('spn'),
    projectId: data.projectId,
    name: data.name.trim(),
    goal: data.goal ?? null,
    status: data.status ?? SprintStatus.PLANNED,
    startDate: new Date(data.startDate).toISOString(),
    endDate: new Date(data.endDate).toISOString(),
    createdAt: now,
    updatedAt: now,
  });

  return hydrateSprint(prisma, record);
}

export async function updateSprint(
  prisma: PrismaService,
  id: number,
  data: UpdateSprintData,
): Promise<SprintWithDetails | null> {
  const sprintModel = getSprintModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload['name'] = data.name.trim();
  if (data.goal !== undefined) updatePayload['goal'] = data.goal;
  if (data.status !== undefined) updatePayload['status'] = data.status;
  if (data.startDate !== undefined)
    updatePayload['startDate'] = new Date(data.startDate).toISOString();
  if (data.endDate !== undefined)
    updatePayload['endDate'] = new Date(data.endDate).toISOString();

  await sprintModel.where({ id }).update(updatePayload);
  return findSprintById(prisma, id);
}

export async function deleteSprint(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const sprintModel = getSprintModel(prisma);
  await sprintModel.where({ id }).delete();
  return true;
}

export async function addTaskToSprint(
  prisma: PrismaService,
  sprintId: number,
  taskId: number,
  pubId?: string,
): Promise<PrismaSprintTaskRecord> {
  const sprintTaskModel = getSprintTaskModel(prisma);
  const records = await sprintTaskModel
    .where((st: { sprintId: { eq: (val: number) => unknown } }) =>
      st.sprintId.eq(sprintId),
    )
    .all();

  const existing = (records || []).find((r) => r.taskId === taskId);
  if (existing) return existing;

  return sprintTaskModel.create({
    pubId: pubId ?? generatePubId('spt'),
    sprintId,
    taskId,
  });
}

export async function removeTaskFromSprint(
  prisma: PrismaService,
  sprintId: number,
  taskId: number,
): Promise<boolean> {
  const sprintTaskModel = getSprintTaskModel(prisma);
  const records = await sprintTaskModel
    .where((st: { sprintId: { eq: (val: number) => unknown } }) =>
      st.sprintId.eq(sprintId),
    )
    .all();

  const matched = (records || []).find((r) => r.taskId === taskId);
  if (matched) {
    await sprintTaskModel
      .where((st: { pubId: { eq: (val: string) => unknown } }) =>
        st.pubId.eq(matched.pubId),
      )
      .delete();
  }
  return true;
}

export async function listSprintTasks(
  prisma: PrismaService,
  sprintId: number,
): Promise<TaskWithDetails[]> {
  const sprintTaskModel = getSprintTaskModel(prisma);
  const records = await sprintTaskModel
    .where((st: { sprintId: { eq: (val: number) => unknown } }) =>
      st.sprintId.eq(sprintId),
    )
    .all();

  const tasks: TaskWithDetails[] = [];
  for (const item of records || []) {
    const task = await findTaskById(prisma, item.taskId);
    if (task) tasks.push(task);
  }
  return tasks;
}

export async function listSprintsForTask(
  prisma: PrismaService,
  taskId: number,
): Promise<PrismaSprintRecord[]> {
  const sprintTaskModel = getSprintTaskModel(prisma);
  const records = await sprintTaskModel
    .where((st: { taskId: { eq: (val: number) => unknown } }) =>
      st.taskId.eq(taskId),
    )
    .all();

  const sprints: PrismaSprintRecord[] = [];
  for (const item of records || []) {
    const sprintModel = getSprintModel(prisma);
    const sprint = await sprintModel.first({ id: item.sprintId });
    if (sprint) sprints.push(sprint);
  }
  return sprints;
}

// ==========================================
// HYDRATION HELPERS
// ==========================================

export async function hydrateTask(
  prisma: PrismaService,
  record: PrismaTaskRecord,
): Promise<TaskWithDetails> {
  const [
    creator,
    project,
    parentTask,
    subTasks,
    assignees,
    labels,
    comments,
    dependencies,
    blockedBy,
    sprints,
  ] = await Promise.all([
    UserHelper.findUserById(prisma, record.createdById),
    ProjectHelper.findProjectById(prisma, record.projectId),
    record.parentTaskId
      ? getTaskModel(prisma).first({ id: record.parentTaskId })
      : null,
    listSubTasks(prisma, record.id),
    listTaskAssignees(prisma, record.id),
    listLabelsForTask(prisma, record.id),
    listCommentsByTask(prisma, record.id),
    listDependenciesForTask(prisma, record.id),
    listBlockedByForTask(prisma, record.id),
    listSprintsForTask(prisma, record.id),
  ]);

  return {
    ...record,
    creator: creator ?? undefined,
    project: project ?? undefined,
    parentTask: parentTask ?? null,
    subTasks,
    assignees,
    labels,
    comments,
    dependencies,
    blockedBy,
    sprints,
  };
}

export async function hydrateSprint(
  prisma: PrismaService,
  record: PrismaSprintRecord,
): Promise<SprintWithDetails> {
  const [project, tasks] = await Promise.all([
    ProjectHelper.findProjectById(prisma, record.projectId),
    listSprintTasks(prisma, record.id),
  ]);

  return {
    ...record,
    project: project ?? undefined,
    taskCount: tasks.length,
    tasks,
  };
}
