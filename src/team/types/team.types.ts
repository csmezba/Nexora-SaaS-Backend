import type { PrismaUserRecord } from '../../user/types/user.types.js';

export interface PrismaTeamRecord {
  id: number;
  pubId: string;
  organizationId: number;
  name: string;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaTeamMemberRecord {
  pubId: string;
  teamId: number;
  userId: number;
  joinedAt: string | Date;
}

export interface TeamWithDetails extends PrismaTeamRecord {
  memberCount: number;
  members?: (PrismaTeamMemberRecord & { user?: PrismaUserRecord })[];
}

export interface CreateTeamData {
  organizationId: number;
  name: string;
  description?: string | null;
  pubId?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string | null;
}

export interface AddTeamMemberData {
  teamId: number;
  userId: number;
  pubId?: string;
}
