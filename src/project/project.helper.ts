import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import * as UserHelper from '../user/user.helper.js';
import * as TeamHelper from '../team/team.helper.js';
import { ProjectStatus } from './enums/project-status.enum.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  AddProjectMemberData,
  CreateProjectData,
  PrismaProjectMemberRecord,
  PrismaProjectRecord,
  ProjectWithDetails,
  UpdateProjectData,
} from './types/project.types.js';

export function getProjectModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaProjectRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaProjectRecord>
  >;
  return (
    orm['Project'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaProjectRecord>>)?.['Project'] ||
    orm['project']!
  );
}

export function getProjectMemberModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaProjectMemberRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaProjectMemberRecord>
  >;
  return (
    orm['ProjectMember'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaProjectMemberRecord>>)?.['ProjectMember'] ||
    orm['projectMember']!
  );
}

// --- Project Queries ---

export async function findProjectById(
  prisma: PrismaService,
  id: number,
): Promise<ProjectWithDetails | null> {
  const projectModel = getProjectModel(prisma);
  const record = await projectModel.first({ id });
  if (!record) return null;
  return hydrateProject(prisma, record);
}

export async function findProjectByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<ProjectWithDetails | null> {
  const projectModel = getProjectModel(prisma);
  const record = await projectModel
    .where((p: { pubId: { eq: (val: string) => unknown } }) =>
      p.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  return hydrateProject(prisma, record);
}

export async function findProjectByKeyAndOrg(
  prisma: PrismaService,
  organizationId: number,
  key: string,
): Promise<ProjectWithDetails | null> {
  const projectModel = getProjectModel(prisma);
  const trimmed = key.trim().toUpperCase();
  const records = await projectModel
    .where((p: { organizationId: { eq: (val: number) => unknown } }) =>
      p.organizationId.eq(organizationId),
    )
    .all();

  const matched = (records || []).find(
    (p) =>
      p.organizationId === organizationId &&
      p.key.toUpperCase() === trimmed,
  );
  if (!matched) return null;
  return hydrateProject(prisma, matched);
}

export async function listProjectsByOrg(
  prisma: PrismaService,
  organizationId: number,
): Promise<ProjectWithDetails[]> {
  const projectModel = getProjectModel(prisma);
  const records = await projectModel
    .where((p: { organizationId: { eq: (val: number) => unknown } }) =>
      p.organizationId.eq(organizationId),
    )
    .all();

  const results: ProjectWithDetails[] = [];
  for (const record of records || []) {
    const hydrated = await hydrateProject(prisma, record);
    results.push(hydrated);
  }
  return results;
}

export async function listProjectsByTeam(
  prisma: PrismaService,
  teamId: number,
): Promise<ProjectWithDetails[]> {
  const projectModel = getProjectModel(prisma);
  const records = await projectModel
    .where((p: { teamId: { eq: (val: number) => unknown } }) =>
      p.teamId.eq(teamId),
    )
    .all();

  const results: ProjectWithDetails[] = [];
  for (const record of records || []) {
    const hydrated = await hydrateProject(prisma, record);
    results.push(hydrated);
  }
  return results;
}

export async function listProjectsByUser(
  prisma: PrismaService,
  userId: number,
  organizationId?: number,
): Promise<ProjectWithDetails[]> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const memberships = await projectMemberModel
    .where((pm: { userId: { eq: (val: number) => unknown } }) =>
      pm.userId.eq(userId),
    )
    .all();

  const results: ProjectWithDetails[] = [];
  for (const mem of memberships || []) {
    const project = await findProjectById(prisma, mem.projectId);
    if (project) {
      if (organizationId !== undefined && project.organizationId !== organizationId) {
        continue;
      }
      results.push(project);
    }
  }
  return results;
}

// --- Project Mutations ---

export async function createProject(
  prisma: PrismaService,
  data: CreateProjectData,
): Promise<ProjectWithDetails> {
  const projectModel = getProjectModel(prisma);
  const now = new Date().toISOString();
  const record = await projectModel.create({
    pubId: data.pubId ?? generatePubId('prj'),
    organizationId: data.organizationId,
    teamId: data.teamId ?? null,
    createdById: data.createdById,
    name: data.name.trim(),
    key: data.key.trim().toUpperCase(),
    description: data.description ?? null,
    status: data.status ?? ProjectStatus.ACTIVE,
    startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    createdAt: now,
    updatedAt: now,
  });

  return hydrateProject(prisma, record);
}

export async function updateProject(
  prisma: PrismaService,
  id: number,
  data: UpdateProjectData,
): Promise<ProjectWithDetails | null> {
  const projectModel = getProjectModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload['name'] = data.name.trim();
  if (data.key !== undefined) updatePayload['key'] = data.key.trim().toUpperCase();
  if (data.description !== undefined)
    updatePayload['description'] = data.description;
  if (data.status !== undefined) updatePayload['status'] = data.status;
  if (data.teamId !== undefined) updatePayload['teamId'] = data.teamId;
  if (data.startDate !== undefined)
    updatePayload['startDate'] = data.startDate
      ? new Date(data.startDate).toISOString()
      : null;
  if (data.dueDate !== undefined)
    updatePayload['dueDate'] = data.dueDate
      ? new Date(data.dueDate).toISOString()
      : null;

  await projectModel.where({ id }).update(updatePayload);
  return findProjectById(prisma, id);
}

export async function deleteProject(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const projectModel = getProjectModel(prisma);
  await projectModel.where({ id }).delete();
  return true;
}

// --- Project Member Operations ---

export async function findProjectMember(
  prisma: PrismaService,
  projectId: number,
  userId: number,
): Promise<PrismaProjectMemberRecord | null> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const all = await projectMemberModel
    .where((pm: { projectId: { eq: (val: number) => unknown } }) =>
      pm.projectId.eq(projectId),
    )
    .all();

  return (all || []).find((m) => m.userId === userId) ?? null;
}

export async function listProjectMembers(
  prisma: PrismaService,
  projectId: number,
): Promise<(PrismaProjectMemberRecord & { user?: any })[]> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const records = await projectMemberModel
    .where((pm: { projectId: { eq: (val: number) => unknown } }) =>
      pm.projectId.eq(projectId),
    )
    .all();

  const membersWithUsers: (PrismaProjectMemberRecord & { user?: any })[] = [];
  for (const record of records || []) {
    const user = await UserHelper.findUserById(prisma, record.userId);
    membersWithUsers.push({
      ...record,
      user: user ?? undefined,
    });
  }
  return membersWithUsers;
}

export async function countProjectMembers(
  prisma: PrismaService,
  projectId: number,
): Promise<number> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const records = await projectMemberModel
    .where((pm: { projectId: { eq: (val: number) => unknown } }) =>
      pm.projectId.eq(projectId),
    )
    .all();

  return (records || []).length;
}

export async function addMemberToProject(
  prisma: PrismaService,
  data: AddProjectMemberData,
): Promise<PrismaProjectMemberRecord> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const existing = await findProjectMember(prisma, data.projectId, data.userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  return projectMemberModel.create({
    pubId: data.pubId ?? generatePubId('prm'),
    projectId: data.projectId,
    userId: data.userId,
    joinedAt: now,
  });
}

export async function removeMemberFromProject(
  prisma: PrismaService,
  projectId: number,
  userId: number,
): Promise<boolean> {
  const projectMemberModel = getProjectMemberModel(prisma);
  const all = await projectMemberModel
    .where((pm: { projectId: { eq: (val: number) => unknown } }) =>
      pm.projectId.eq(projectId),
    )
    .all();

  const matched = (all || []).find((m) => m.userId === userId);
  if (matched) {
    await projectMemberModel
      .where((pm: { pubId: { eq: (val: string) => unknown } }) =>
        pm.pubId.eq(matched.pubId),
      )
      .delete();
  }

  return true;
}

// --- Internal Hydration ---

async function hydrateProject(
  prisma: PrismaService,
  record: PrismaProjectRecord,
): Promise<ProjectWithDetails> {
  const [creator, team, members] = await Promise.all([
    UserHelper.findUserById(prisma, record.createdById),
    record.teamId ? TeamHelper.findTeamById(prisma, record.teamId) : null,
    listProjectMembers(prisma, record.id),
  ]);

  return {
    ...record,
    creator: creator ?? undefined,
    team: team ?? null,
    memberCount: members.length,
    members,
  };
}
