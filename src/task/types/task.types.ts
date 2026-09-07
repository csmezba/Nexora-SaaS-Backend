import type { TaskStatus } from '../enums/task-status.enum.js';
import type { TaskPriority } from '../enums/task-priority.enum.js';
import type { DependencyType } from '../enums/dependency-type.enum.js';
import type { SprintStatus } from '../enums/sprint-status.enum.js';
import type { PrismaUserRecord } from '../../user/types/user.types.js';
import type { PrismaProjectRecord } from '../../project/types/project.types.js';

export interface PrismaTaskRecord {
  id: number;
  pubId: string;
  projectId: number;
  createdById: number;
  parentTaskId?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface PrismaTaskAssigneeRecord {
  pubId: string;
  taskId: number;
  userId: number;
  assignedAt: string | Date;
}

export interface PrismaLabelRecord {
  id: number;
  pubId: string;
  organizationId: number;
  name: string;
  color: string;
}

export interface PrismaTaskLabelRecord {
  pubId: string;
  taskId: number;
  labelId: number;
}

export interface PrismaTaskCommentRecord {
  id: number;
  pubId: string;
  taskId: number;
  authorId: number;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface PrismaTaskDependencyRecord {
  id: number;
  pubId: string;
  taskId: number;
  dependsOnTaskId: number;
  type: DependencyType;
  createdAt: string | Date;
}

export interface PrismaSprintRecord {
  id: number;
  pubId: string;
  projectId: number;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate: string | Date;
  endDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaSprintTaskRecord {
  pubId: string;
  sprintId: number;
  taskId: number;
}

// --- Hydrated and Detailed Types ---

export interface TaskAssigneeWithUser extends PrismaTaskAssigneeRecord {
  user?: PrismaUserRecord;
}

export interface TaskLabelWithLabel extends PrismaTaskLabelRecord {
  label?: PrismaLabelRecord;
}

export interface TaskCommentWithAuthor extends PrismaTaskCommentRecord {
  author?: PrismaUserRecord;
}

export interface TaskDependencyWithTask extends PrismaTaskDependencyRecord {
  dependsOnTask?: PrismaTaskRecord;
  task?: PrismaTaskRecord;
}

export interface SprintTaskWithTask extends PrismaSprintTaskRecord {
  task?: PrismaTaskRecord;
}

export interface TaskWithDetails extends PrismaTaskRecord {
  creator?: PrismaUserRecord;
  project?: PrismaProjectRecord;
  parentTask?: PrismaTaskRecord | null;
  subTasks?: PrismaTaskRecord[];
  assignees?: TaskAssigneeWithUser[];
  labels?: PrismaLabelRecord[];
  comments?: TaskCommentWithAuthor[];
  dependencies?: TaskDependencyWithTask[];
  blockedBy?: TaskDependencyWithTask[];
  sprints?: PrismaSprintRecord[];
}

export interface SprintWithDetails extends PrismaSprintRecord {
  project?: PrismaProjectRecord;
  taskCount: number;
  tasks?: TaskWithDetails[];
}

// --- Data Input Interfaces ---

export interface CreateTaskData {
  projectId: number;
  createdById: number;
  parentTaskId?: number | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  dueDate?: string | Date | null;
  pubId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  dueDate?: string | Date | null;
  parentTaskId?: number | null;
}

export interface CreateLabelData {
  organizationId: number;
  name: string;
  color: string;
  pubId?: string;
}

export interface UpdateLabelData {
  name?: string;
  color?: string;
}

export interface CreateTaskCommentData {
  taskId: number;
  authorId: number;
  content: string;
  pubId?: string;
}

export interface UpdateTaskCommentData {
  content: string;
}

export interface CreateSprintData {
  projectId: number;
  name: string;
  goal?: string | null;
  status?: SprintStatus;
  startDate: string | Date;
  endDate: string | Date;
  pubId?: string;
}

export interface UpdateSprintData {
  name?: string;
  goal?: string | null;
  status?: SprintStatus;
  startDate?: string | Date;
  endDate?: string | Date;
}
