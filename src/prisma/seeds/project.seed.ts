import { generatePubId } from '../../common/utils/unique-id.util.js';
import { ProjectStatus } from '../../project/enums/project-status.enum.js';
import { getOrmModel, logger } from './common.js';
import {
  seedOrganizations,
  type SeededOrganizationResult,
} from './organization.seed.js';
import { seedTeams, type SeededTeamResult } from './team.seed.js';
import { seedUsers, type SeededUserRecord } from './user.seed.js';

export interface SeedProjectDefinition {
  orgSlug: string;
  teamName?: string;
  creatorEmail: string;
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  memberEmails: string[];
}

export const SEED_PROJECTS: SeedProjectDefinition[] = [
  // --- Nexora Labs Projects ---
  {
    orgSlug: 'nexora-labs',
    teamName: 'Engineering',
    creatorEmail: 'owner@nexora.app',
    name: 'Nexora Platform Core',
    key: 'NEX',
    description:
      'Multi-tenant SaaS backend architecture, authentication, RBAC, and core APIs.',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-12-31T23:59:59.000Z',
    memberEmails: [
      'owner@nexora.app',
      'lead.dev@nexora.app',
      'dev@nexora.app',
      'qa@nexora.app',
    ],
  },
  {
    orgSlug: 'nexora-labs',
    teamName: 'Product & Design',
    creatorEmail: 'owner@nexora.app',
    name: 'Design System & UI Library',
    key: 'DSG',
    description:
      'Component library, design tokens, responsive UI layouts, and accessibility.',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-02-01T00:00:00.000Z',
    dueDate: '2026-10-31T23:59:59.000Z',
    memberEmails: ['owner@nexora.app', 'member@nexora.app'],
  },
  {
    orgSlug: 'nexora-labs',
    teamName: 'Engineering',
    creatorEmail: 'admin@nexora.app',
    name: 'Observability & Telemetry',
    key: 'OBS',
    description:
      'Integration with NestJS Observe, distributed tracing, metrics, and error reporting.',
    status: ProjectStatus.PLANNING,
    startDate: '2026-03-01T00:00:00.000Z',
    dueDate: '2026-09-30T23:59:59.000Z',
    memberEmails: [
      'admin@nexora.app',
      'lead.dev@nexora.app',
      'qa@nexora.app',
    ],
  },

  // --- Acme Corporation Projects ---
  {
    orgSlug: 'acme-corp',
    teamName: 'Platform Engineering',
    creatorEmail: 'admin@nexora.app',
    name: 'Acme Cloud Gateway',
    key: 'ACME',
    description:
      'Enterprise API gateway, multi-region routing, and custom authentication microservices.',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-01-15T00:00:00.000Z',
    dueDate: '2026-11-30T23:59:59.000Z',
    memberEmails: [
      'admin@nexora.app',
      'lead.dev@nexora.app',
      'dev@nexora.app',
    ],
  },
  {
    orgSlug: 'acme-corp',
    teamName: 'Solutions Delivery',
    creatorEmail: 'lead.dev@nexora.app',
    name: 'Solutions Integration Suite',
    key: 'SOL',
    description:
      'Client delivery workflows, external webhooks, and third-party SaaS integrations.',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-02-15T00:00:00.000Z',
    dueDate: '2026-08-31T23:59:59.000Z',
    memberEmails: ['lead.dev@nexora.app', 'member@nexora.app'],
  },
];

export interface SeededProjectResult {
  projects: any[];
  projectMembersCount: number;
}

export async function seedProjects(): Promise<SeededProjectResult> {
  logger.info('Seeding projects and project memberships...');
  const projectModel = getOrmModel('Project');
  const projectMemberModel = getOrmModel('ProjectMember');
  const teamModel = getOrmModel('Team');
  const orgModel = getOrmModel('Organization');
  const userModel = getOrmModel('User');

  if (
    !projectModel ||
    !projectMemberModel ||
    !teamModel ||
    !orgModel ||
    !userModel
  ) {
    throw new Error('Required models not found in Prisma ORM');
  }

  // Ensure users exist
  let users: SeededUserRecord[] = (await userModel.all()) || [];
  if (users.length === 0) {
    users = await seedUsers();
  }

  const userMap = new Map<string, SeededUserRecord>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase().trim(), u);
  }

  // Ensure organizations exist
  let orgs: any[] = (await orgModel.all()) || [];
  if (orgs.length === 0) {
    const orgResult: SeededOrganizationResult = await seedOrganizations();
    orgs = orgResult.organizations;
  }

  const orgMap = new Map<string, any>();
  for (const o of orgs) {
    orgMap.set(o.slug.toLowerCase().trim(), o);
  }

  // Ensure teams exist
  let teams: any[] = (await teamModel.all()) || [];
  if (teams.length === 0) {
    const teamResult: SeededTeamResult = await seedTeams();
    teams = teamResult.teams;
  }

  const teamMap = new Map<string, any>();
  for (const t of teams) {
    teamMap.set(`${t.organizationId}:${t.name.toLowerCase().trim()}`, t);
  }

  const existingProjects: any[] = (await projectModel.all()) || [];
  const projectMap = new Map<string, any>();
  for (const p of existingProjects) {
    projectMap.set(`${p.organizationId}:${p.key.toUpperCase()}`, p);
  }

  const existingMemberships: any[] =
    (await projectMemberModel.all()) || [];
  const membershipSet = new Set<string>();
  for (const m of existingMemberships) {
    membershipSet.add(`${m.projectId}:${m.userId}`);
  }

  const now = new Date().toISOString();
  const seededProjects: any[] = [];
  let newProjectMembersCount = 0;

  for (const seedProj of SEED_PROJECTS) {
    const org = orgMap.get(seedProj.orgSlug.toLowerCase().trim());
    if (!org) {
      logger.warn(
        `Organization '${seedProj.orgSlug}' not found for project '${seedProj.name}', skipping...`,
      );
      continue;
    }

    const creator = userMap.get(
      seedProj.creatorEmail.toLowerCase().trim(),
    );
    if (!creator) {
      logger.warn(
        `Creator '${seedProj.creatorEmail}' not found for project '${seedProj.name}', skipping...`,
      );
      continue;
    }

    let teamId: number | null = null;
    if (seedProj.teamName) {
      const teamKey = `${org.id}:${seedProj.teamName.toLowerCase().trim()}`;
      const team = teamMap.get(teamKey);
      if (team) {
        teamId = team.id;
      }
    }

    const projKey = `${org.id}:${seedProj.key.toUpperCase()}`;
    let project = projectMap.get(projKey);

    if (!project) {
      project = await projectModel.create({
        pubId: generatePubId('prj'),
        organizationId: org.id,
        teamId,
        createdById: creator.id,
        name: seedProj.name,
        key: seedProj.key.toUpperCase(),
        description: seedProj.description,
        status: seedProj.status,
        startDate: seedProj.startDate ?? null,
        dueDate: seedProj.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
      });
      projectMap.set(projKey, project);
      logger.success(
        `Created project "${project.name}" [${project.key}] for org "${org.name || org.slug}"`,
      );
    }
    seededProjects.push(project);

    // Assign project members
    for (const email of seedProj.memberEmails) {
      const user = userMap.get(email.toLowerCase().trim());
      if (!user) {
        logger.warn(
          `User '${email}' not found for project assignment, skipping...`,
        );
        continue;
      }

      const memKey = `${project.id}:${user.id}`;
      if (!membershipSet.has(memKey)) {
        await projectMemberModel.create({
          pubId: generatePubId('prm'),
          projectId: project.id,
          userId: user.id,
          joinedAt: now,
        });
        membershipSet.add(memKey);
        newProjectMembersCount++;
        logger.success(
          `Assigned user ${email} to project "${project.name}" (${project.key})`,
        );
      }
    }
  }

  logger.success(
    `Projects seeding complete. Projects: ${seededProjects.length}, New Project Memberships: ${newProjectMembersCount}`,
  );

  return {
    projects: seededProjects,
    projectMembersCount: membershipSet.size,
  };
}
