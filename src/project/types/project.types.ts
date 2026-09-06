import type { ProjectStatus } from '../enums/project-status.enum.js';
import type { PrismaUserRecord } from '../../user/types/user.types.js';
import type { PrismaTeamRecord } from '../../team/types/team.types.js';

export interface PrismaProjectRecord {
  id: number;
  pubId: string;
  organizationId: number;
  teamId?: number | null;
  createdById: number;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaProjectMemberRecord {
  pubId: string;
  projectId: number;
  userId: number;
  joinedAt: string | Date;
}

export interface ProjectWithDetails extends PrismaProjectRecord {
  creator?: PrismaUserRecord;
  team?: PrismaTeamRecord | null;
  memberCount: number;
  members?: (PrismaProjectMemberRecord & { user?: PrismaUserRecord })[];
}

export interface CreateProjectData {
  organizationId: number;
  teamId?: number | null;
  createdById: number;
  name: string;
  key: string;
  description?: string | null;
  status?: ProjectStatus;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  pubId?: string;
}

export interface UpdateProjectData {
  name?: string;
  key?: string;
  description?: string | null;
  status?: ProjectStatus;
  teamId?: number | null;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
}

export interface AddProjectMemberData {
  projectId: number;
  userId: number;
  pubId?: string;
}
