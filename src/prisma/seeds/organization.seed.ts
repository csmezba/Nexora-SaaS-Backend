import { generatePubId } from '../../common/utils/unique-id.util.js';
import { OrganizationRole } from '../../organization/enums/organization-role.enum.js';
import { getOrmModel, logger } from './common.js';
import { seedUsers, type SeededUserRecord } from './user.seed.js';

export interface SeedOrganizationData {
  name: string;
  slug: string;
  description: string;
  members: {
    userEmail: string;
    role: OrganizationRole;
  }[];
}

export const SEED_ORGANIZATIONS: SeedOrganizationData[] = [
  {
    name: 'Nexora Labs',
    slug: 'nexora-labs',
    description:
      'Core engineering and product innovation workspace for Nexora SaaS platform.',
    members: [
      { userEmail: 'owner@nexora.app', role: OrganizationRole.OWNER },
      { userEmail: 'admin@nexora.app', role: OrganizationRole.ADMIN },
      { userEmail: 'lead.dev@nexora.app', role: OrganizationRole.DEVELOPER },
      { userEmail: 'dev@nexora.app', role: OrganizationRole.DEVELOPER },
      { userEmail: 'qa@nexora.app', role: OrganizationRole.QA },
      { userEmail: 'member@nexora.app', role: OrganizationRole.DESIGNER },
      { userEmail: 'viewer@nexora.app', role: OrganizationRole.VIEWER },
    ],
  },
  {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    description:
      'Enterprise global pilot organization managing multi-team projects and operations.',
    members: [
      { userEmail: 'admin@nexora.app', role: OrganizationRole.OWNER },
      { userEmail: 'lead.dev@nexora.app', role: OrganizationRole.ADMIN },
      { userEmail: 'dev@nexora.app', role: OrganizationRole.DEVELOPER },
      { userEmail: 'member@nexora.app', role: OrganizationRole.MEMBER },
    ],
  },
];

export interface SeededOrganizationResult {
  organizations: {
    id: number;
    pubId: string;
    name?: string | null;
    slug: string;
    description?: string | null;
  }[];
  members: {
    id: number;
    pubId: string;
    organizationId: number;
    userId: number;
    role: string;
  }[];
}

export async function seedOrganizations(): Promise<SeededOrganizationResult> {
  logger.info('Seeding organizations & memberships...');
  const orgModel = getOrmModel('Organization');
  const memberModel = getOrmModel('OrganizationMember');
  const userModel = getOrmModel('User');

  if (!orgModel || !memberModel || !userModel) {
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

  const existingOrgs: any[] = (await orgModel.all()) || [];
  const orgMap = new Map<string, any>();
  for (const o of existingOrgs) {
    orgMap.set(o.slug.toLowerCase().trim(), o);
  }

  const existingMembers: any[] = (await memberModel.all()) || [];
  const memberMap = new Map<string, any>();
  for (const m of existingMembers) {
    memberMap.set(`${m.organizationId}:${m.userId}`, m);
  }

  const now = new Date().toISOString();
  const seededOrgs: any[] = [];
  const seededMembers: any[] = [];

  for (const seedOrg of SEED_ORGANIZATIONS) {
    const normalizedSlug = seedOrg.slug.toLowerCase().trim();
    let org = orgMap.get(normalizedSlug);

    if (org) {
      logger.warn(`Organization already exists: ${seedOrg.name} (${normalizedSlug})`);
      seededOrgs.push(org);
    } else {
      org = await orgModel.create({
        pubId: generatePubId('org'),
        name: seedOrg.name,
        slug: normalizedSlug,
        description: seedOrg.description,
        logoUrl: null,
        createdAt: now,
        updatedAt: now,
      });
      orgMap.set(normalizedSlug, org);
      seededOrgs.push(org);
      logger.success(`Created organization: ${seedOrg.name} (${normalizedSlug})`);
    }

    // Seed organization members
    for (const memberDef of seedOrg.members) {
      const user = userMap.get(memberDef.userEmail.toLowerCase().trim());
      if (!user) {
        logger.warn(
          `User ${memberDef.userEmail} not found, skipping membership in ${seedOrg.name}`,
        );
        continue;
      }

      const memberKey = `${org.id}:${user.id}`;
      let member = memberMap.get(memberKey);

      if (member) {
        seededMembers.push(member);
      } else {
        member = await memberModel.create({
          pubId: generatePubId('mem'),
          organizationId: org.id,
          userId: user.id,
          role: memberDef.role,
          joinedAt: now,
        });
        memberMap.set(memberKey, member);
        seededMembers.push(member);
        logger.success(
          `Added member ${memberDef.userEmail} to ${seedOrg.name} as ${memberDef.role}`,
        );
      }
    }
  }

  logger.success(
    `Organizations seeding complete. Organizations: ${seededOrgs.length}, Members: ${seededMembers.length}`,
  );

  return { organizations: seededOrgs, members: seededMembers };
}

// Allow direct execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('organization.seed.ts') ||
    process.argv[1].endsWith('organization.seed.js'))
) {
  seedOrganizations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Organization seeding failed: ${err.message}`);
      process.exit(1);
    });
}
