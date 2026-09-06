import { generatePubId } from '../../common/utils/unique-id.util.js';
import { getOrmModel, logger } from './common.js';
import {
  seedOrganizations,
  type SeededOrganizationResult,
} from './organization.seed.js';
import { seedUsers, type SeededUserRecord } from './user.seed.js';

export interface SeedTeamDefinition {
  orgSlug: string;
  name: string;
  description: string;
  memberEmails: string[];
}

export const SEED_TEAMS: SeedTeamDefinition[] = [
  // --- Nexora Labs Teams ---
  {
    orgSlug: 'nexora-labs',
    name: 'Engineering',
    description:
      'Core backend, frontend, and infrastructure engineering team.',
    memberEmails: [
      'owner@nexora.app',
      'admin@nexora.app',
      'lead.dev@nexora.app',
      'dev@nexora.app',
      'qa@nexora.app',
    ],
  },
  {
    orgSlug: 'nexora-labs',
    name: 'Product & Design',
    description:
      'UI/UX design, product management, and design system team.',
    memberEmails: ['owner@nexora.app', 'member@nexora.app'],
  },
  {
    orgSlug: 'nexora-labs',
    name: 'Growth & Operations',
    description:
      'Customer success, marketing, and business operations team.',
    memberEmails: ['admin@nexora.app', 'viewer@nexora.app'],
  },

  // --- Acme Corporation Teams ---
  {
    orgSlug: 'acme-corp',
    name: 'Platform Engineering',
    description:
      'Enterprise platform development and core systems integration.',
    memberEmails: [
      'admin@nexora.app',
      'lead.dev@nexora.app',
      'dev@nexora.app',
    ],
  },
  {
    orgSlug: 'acme-corp',
    name: 'Solutions Delivery',
    description:
      'Customer solutions delivery and client deployment management.',
    memberEmails: ['lead.dev@nexora.app', 'member@nexora.app'],
  },
];

export interface SeededTeamResult {
  teams: any[];
  teamMembersCount: number;
}

export async function seedTeams(): Promise<SeededTeamResult> {
  logger.info('Seeding teams and team memberships...');
  const teamModel = getOrmModel('Team');
  const teamMemberModel = getOrmModel('TeamMember');
  const orgModel = getOrmModel('Organization');
  const userModel = getOrmModel('User');

  if (!teamModel || !teamMemberModel || !orgModel || !userModel) {
    throw new Error('Required models not found in Prisma ORM');
  }

  // Ensure users & organizations exist
  let users: SeededUserRecord[] = (await userModel.all()) || [];
  if (users.length === 0) {
    users = await seedUsers();
  }

  const userMap = new Map<string, SeededUserRecord>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase().trim(), u);
  }

  let orgs: any[] = (await orgModel.all()) || [];
  if (orgs.length === 0) {
    const orgResult: SeededOrganizationResult = await seedOrganizations();
    orgs = orgResult.organizations;
  }

  const orgMap = new Map<string, any>();
  for (const o of orgs) {
    orgMap.set(o.slug.toLowerCase().trim(), o);
  }

  const existingTeams: any[] = (await teamModel.all()) || [];
  const teamMap = new Map<string, any>();
  for (const t of existingTeams) {
    teamMap.set(`${t.organizationId}:${t.name.toLowerCase().trim()}`, t);
  }

  const existingMemberships: any[] = (await teamMemberModel.all()) || [];
  const membershipSet = new Set<string>();
  for (const m of existingMemberships) {
    membershipSet.add(`${m.teamId}:${m.userId}`);
  }

  const now = new Date().toISOString();
  const seededTeams: any[] = [];
  let newTeamMembersCount = 0;

  for (const seedTeam of SEED_TEAMS) {
    const org = orgMap.get(seedTeam.orgSlug.toLowerCase().trim());
    if (!org) {
      logger.warn(
        `Organization '${seedTeam.orgSlug}' not found for team '${seedTeam.name}', skipping...`,
      );
      continue;
    }

    const teamKey = `${org.id}:${seedTeam.name.toLowerCase().trim()}`;
    let team = teamMap.get(teamKey);

    if (!team) {
      team = await teamModel.create({
        pubId: generatePubId('tem'),
        organizationId: org.id,
        name: seedTeam.name,
        description: seedTeam.description,
        createdAt: now,
        updatedAt: now,
      });
      teamMap.set(teamKey, team);
      logger.success(
        `Created team "${team.name}" for org "${org.name || org.slug}"`,
      );
    }
    seededTeams.push(team);

    // Assign team members
    for (const email of seedTeam.memberEmails) {
      const user = userMap.get(email.toLowerCase().trim());
      if (!user) {
        logger.warn(
          `User '${email}' not found for team assignment, skipping...`,
        );
        continue;
      }

      const memKey = `${team.id}:${user.id}`;
      if (!membershipSet.has(memKey)) {
        await teamMemberModel.create({
          pubId: generatePubId('tmm'),
          teamId: team.id,
          userId: user.id,
          joinedAt: now,
        });
        membershipSet.add(memKey);
        newTeamMembersCount++;
        logger.success(
          `Added user ${email} to team "${team.name}" (${org.slug})`,
        );
      }
    }
  }

  logger.success(
    `Teams seeding complete. Teams: ${seededTeams.length}, New Team Memberships: ${newTeamMembersCount}`,
  );

  return {
    teams: seededTeams,
    teamMembersCount: membershipSet.size,
  };
}
