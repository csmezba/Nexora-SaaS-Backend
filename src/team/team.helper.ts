import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import * as UserHelper from '../user/user.helper.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  AddTeamMemberData,
  CreateTeamData,
  PrismaTeamMemberRecord,
  PrismaTeamRecord,
  TeamWithDetails,
  UpdateTeamData,
} from './types/team.types.js';

export function getTeamModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTeamRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaTeamRecord>
  >;
  return (
    orm['Team'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaTeamRecord>>)?.['Team'] ||
    orm['team']!
  );
}

export function getTeamMemberModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTeamMemberRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaTeamMemberRecord>
  >;
  return (
    orm['TeamMember'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaTeamMemberRecord>>)?.['TeamMember'] ||
    orm['teamMember']!
  );
}

// --- Team Queries ---

export async function findTeamById(
  prisma: PrismaService,
  id: number,
): Promise<TeamWithDetails | null> {
  const teamModel = getTeamModel(prisma);
  const record = await teamModel.first({ id });
  if (!record) return null;
  return hydrateTeam(prisma, record);
}

export async function findTeamByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<TeamWithDetails | null> {
  const teamModel = getTeamModel(prisma);
  const record = await teamModel
    .where((t: { pubId: { eq: (val: string) => unknown } }) =>
      t.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  return hydrateTeam(prisma, record);
}

export async function findTeamByNameAndOrg(
  prisma: PrismaService,
  organizationId: number,
  name: string,
): Promise<TeamWithDetails | null> {
  const teamModel = getTeamModel(prisma);
  const trimmed = name.trim();
  const records = await teamModel
    .where((t: { organizationId: { eq: (val: number) => unknown } }) =>
      t.organizationId.eq(organizationId),
    )
    .all();

  const matched = (records || []).find(
    (t) =>
      t.organizationId === organizationId &&
      t.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!matched) return null;
  return hydrateTeam(prisma, matched);
}

export async function listTeamsByOrg(
  prisma: PrismaService,
  organizationId: number,
): Promise<TeamWithDetails[]> {
  const teamModel = getTeamModel(prisma);
  const records = await teamModel
    .where((t: { organizationId: { eq: (val: number) => unknown } }) =>
      t.organizationId.eq(organizationId),
    )
    .all();

  const results: TeamWithDetails[] = [];
  for (const record of records || []) {
    const hydrated = await hydrateTeam(prisma, record);
    results.push(hydrated);
  }
  return results;
}

export async function listTeamsByUser(
  prisma: PrismaService,
  userId: number,
  organizationId?: number,
): Promise<TeamWithDetails[]> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const memberships = await teamMemberModel
    .where((tm: { userId: { eq: (val: number) => unknown } }) =>
      tm.userId.eq(userId),
    )
    .all();

  const results: TeamWithDetails[] = [];
  for (const mem of memberships || []) {
    const team = await findTeamById(prisma, mem.teamId);
    if (team) {
      if (organizationId !== undefined && team.organizationId !== organizationId) {
        continue;
      }
      results.push(team);
    }
  }
  return results;
}

// --- Team Mutations ---

export async function createTeam(
  prisma: PrismaService,
  data: CreateTeamData,
): Promise<TeamWithDetails> {
  const teamModel = getTeamModel(prisma);
  const now = new Date().toISOString();
  const record = await teamModel.create({
    pubId: data.pubId ?? generatePubId('tem'),
    name: data.name.trim(),
    description: data.description ?? null,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...record,
    memberCount: 0,
    members: [],
  };
}

export async function updateTeam(
  prisma: PrismaService,
  id: number,
  data: UpdateTeamData,
): Promise<TeamWithDetails | null> {
  const teamModel = getTeamModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updatePayload['name'] = data.name.trim();
  if (data.description !== undefined)
    updatePayload['description'] = data.description;

  await teamModel.where({ id }).update(updatePayload);
  return findTeamById(prisma, id);
}

export async function deleteTeam(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const teamModel = getTeamModel(prisma);
  await teamModel.where({ id }).delete();
  return true;
}

// --- Team Member Operations ---

export async function findTeamMember(
  prisma: PrismaService,
  teamId: number,
  userId: number,
): Promise<PrismaTeamMemberRecord | null> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const all = await teamMemberModel
    .where((tm: { teamId: { eq: (val: number) => unknown } }) =>
      tm.teamId.eq(teamId),
    )
    .all();

  return (all || []).find((m) => m.userId === userId) ?? null;
}

export async function listTeamMembers(
  prisma: PrismaService,
  teamId: number,
): Promise<(PrismaTeamMemberRecord & { user?: any })[]> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const records = await teamMemberModel
    .where((tm: { teamId: { eq: (val: number) => unknown } }) =>
      tm.teamId.eq(teamId),
    )
    .all();

  const membersWithUsers: (PrismaTeamMemberRecord & { user?: any })[] = [];
  for (const record of records || []) {
    const user = await UserHelper.findUserById(prisma, record.userId);
    membersWithUsers.push({
      ...record,
      user: user ?? undefined,
    });
  }
  return membersWithUsers;
}

export async function countTeamMembers(
  prisma: PrismaService,
  teamId: number,
): Promise<number> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const records = await teamMemberModel
    .where((tm: { teamId: { eq: (val: number) => unknown } }) =>
      tm.teamId.eq(teamId),
    )
    .all();

  return (records || []).length;
}

export async function addMemberToTeam(
  prisma: PrismaService,
  data: AddTeamMemberData,
): Promise<PrismaTeamMemberRecord> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const existing = await findTeamMember(prisma, data.teamId, data.userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  return teamMemberModel.create({
    pubId: data.pubId ?? generatePubId('tmm'),
    teamId: data.teamId,
    userId: data.userId,
    joinedAt: now,
  });
}

export async function removeMemberFromTeam(
  prisma: PrismaService,
  teamId: number,
  userId: number,
): Promise<boolean> {
  const teamMemberModel = getTeamMemberModel(prisma);
  const all = await teamMemberModel
    .where((tm: { teamId: { eq: (val: number) => unknown } }) =>
      tm.teamId.eq(teamId),
    )
    .all();

  const matched = (all || []).find((m) => m.userId === userId);
  if (matched) {
    await teamMemberModel
      .where((tm: { pubId: { eq: (val: string) => unknown } }) =>
        tm.pubId.eq(matched.pubId),
      )
      .delete();
  }

  return true;
}

// --- Internal Helpers ---

async function hydrateTeam(
  prisma: PrismaService,
  record: PrismaTeamRecord,
): Promise<TeamWithDetails> {
  const members = await listTeamMembers(prisma, record.id);
  return {
    ...record,
    memberCount: members.length,
    members,
  };
}
