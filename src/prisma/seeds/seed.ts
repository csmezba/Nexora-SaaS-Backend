import { logger } from './common.js';
import { seedPermissions } from './permission.seed.js';
import { seedUsers } from './user.seed.js';
import { seedAuth } from './auth.seed.js';
import { seedOrganizations } from './organization.seed.js';
import { seedRoles } from './role.seed.js';
import { seedTeams } from './team.seed.js';
import { seedProjects } from './project.seed.js';
import { seedTasks } from './task.seed.js';

export type SeedTarget =
  | 'all'
  | 'user'
  | 'users'
  | 'auth'
  | 'organization'
  | 'organizations'
  | 'org'
  | 'permission'
  | 'permissions'
  | 'role'
  | 'roles'
  | 'team'
  | 'teams'
  | 'project'
  | 'projects'
  | 'task'
  | 'tasks'
  | 'sprint'
  | 'sprints';

export async function runSeeds(target: string = 'all'): Promise<void> {
  const startTime = Date.now();
  const normalizedTarget = target.toLowerCase().trim();

  console.log('\n========================================');
  console.log(`🌱  NEXORA SEED RUNNER [Target: ${normalizedTarget || 'all'}]`);
  console.log('========================================\n');

  try {
    switch (normalizedTarget) {
      case 'user':
      case 'users':
        await seedUsers();
        break;

      case 'auth':
        await seedAuth();
        break;

      case 'org':
      case 'organization':
      case 'organizations':
        await seedOrganizations();
        break;

      case 'permission':
      case 'permissions':
        await seedPermissions();
        break;

      case 'role':
      case 'roles':
        await seedRoles();
        break;

      case 'team':
      case 'teams':
        await seedTeams();
        break;

      case 'project':
      case 'projects':
        await seedProjects();
        break;

      case 'task':
      case 'tasks':
      case 'sprint':
      case 'sprints':
        await seedTasks();
        break;

      case 'all':
      case '':
        logger.info('Running full seed suite in dependency order...\n');
        logger.info('--- STEP 1/8: Permissions ---');
        await seedPermissions();

        console.log('');
        logger.info('--- STEP 2/8: Users ---');
        await seedUsers();

        console.log('');
        logger.info('--- STEP 3/8: Auth ---');
        await seedAuth();

        console.log('');
        logger.info('--- STEP 4/8: Organizations & Members ---');
        await seedOrganizations();

        console.log('');
        logger.info('--- STEP 5/8: Roles & RolePermissions ---');
        await seedRoles();

        console.log('');
        logger.info('--- STEP 6/8: Teams & TeamMembers ---');
        await seedTeams();

        console.log('');
        logger.info('--- STEP 7/8: Projects & ProjectMembers ---');
        await seedProjects();

        console.log('');
        logger.info('--- STEP 8/8: Tasks, Sprints, Labels & Dependencies ---');
        await seedTasks();
        break;

      case '--help':
      case '-h':
      case 'help':
        printHelp();
        return;

      default:
        logger.error(`Unknown seed target: "${target}"`);
        printHelp();
        process.exit(1);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    logger.success(`Seeding finished successfully in ${elapsed}s! ✨`);
    console.log('========================================\n');
  } catch (error: any) {
    logger.error(`Seeding failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Usage:
  npm run seed                    # Run all seed files in sequence
  npm run seed <target>           # Run a specific seed file

Available Targets:
  all                             Run all seeds (default)
  user | users                    Seed initial core users
  auth                            Seed auth sessions and OAuth accounts
  organization | org              Seed demo organizations and memberships
  permission | permissions        Seed standard system permissions
  role | roles                    Seed organization roles and permission bindings
  team | teams                    Seed teams and team memberships
  project | projects              Seed projects and project memberships
  task | tasks | sprint | sprints Seed tasks, sprints, labels, and dependencies

NPM Script Shortcuts:
  npm run seed:user
  npm run seed:auth
  npm run seed:organization
  npm run seed:permission
  npm run seed:role
  npm run seed:team
  npm run seed:project
  npm run seed:task
  npm run seed:all
  `);
}

// Export individual seed functions for external usage
export {
  seedPermissions,
  seedUsers,
  seedAuth,
  seedOrganizations,
  seedRoles,
  seedTeams,
  seedProjects,
  seedTasks,
};

// Direct CLI execution
if (
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))
) {
  const targetArg = process.argv[2] || 'all';
  runSeeds(targetArg)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
