import { generatePubId } from '../../common/utils/unique-id.util.js';
import { TaskStatus } from '../../task/enums/task-status.enum.js';
import { TaskPriority } from '../../task/enums/task-priority.enum.js';
import { DependencyType } from '../../task/enums/dependency-type.enum.js';
import { SprintStatus } from '../../task/enums/sprint-status.enum.js';
import { getOrmModel, logger } from './common.js';
import {
  seedOrganizations,
  type SeededOrganizationResult,
} from './organization.seed.js';
import { seedProjects, type SeededProjectResult } from './project.seed.js';
import { seedUsers, type SeededUserRecord } from './user.seed.js';

export interface SeedLabelDefinition {
  orgSlug: string;
  name: string;
  color: string;
}

export interface SeedSprintDefinition {
  orgSlug: string;
  projectKey: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}

export interface SeedTaskDefinition {
  orgSlug: string;
  projectKey: string;
  creatorEmail: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate?: string;
  parentTaskTitle?: string;
  sprintName?: string;
  assigneeEmails: string[];
  labelNames: string[];
  comments?: { authorEmail: string; content: string }[];
}

export interface SeedDependencyDefinition {
  orgSlug: string;
  projectKey: string;
  taskTitle: string;
  dependsOnTaskTitle: string;
  type: DependencyType;
}

export const SEED_LABELS: SeedLabelDefinition[] = [
  // --- Nexora Labs Labels ---
  { orgSlug: 'nexora-labs', name: 'Bug', color: '#EF4444' },
  { orgSlug: 'nexora-labs', name: 'Feature', color: '#3B82F6' },
  { orgSlug: 'nexora-labs', name: 'Documentation', color: '#10B981' },
  { orgSlug: 'nexora-labs', name: 'Backend', color: '#8B5CF6' },
  { orgSlug: 'nexora-labs', name: 'Frontend', color: '#EC4899' },
  { orgSlug: 'nexora-labs', name: 'High Priority', color: '#F59E0B' },

  // --- Acme Corporation Labels ---
  { orgSlug: 'acme-corp', name: 'Urgent', color: '#DC2626' },
  { orgSlug: 'acme-corp', name: 'Cloud Infrastructure', color: '#0EA5E9' },
  { orgSlug: 'acme-corp', name: 'Security', color: '#F97316' },
  { orgSlug: 'acme-corp', name: 'Performance', color: '#6366F1' },
];

export const SEED_SPRINTS: SeedSprintDefinition[] = [
  // --- Nexora Platform Core Sprints ---
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    name: 'Sprint 1 - Foundation & Auth',
    goal: 'Deliver multi-tenant database schema, JWT auth, and RBAC engine.',
    status: SprintStatus.COMPLETED,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-01-15T23:59:59.000Z',
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    name: 'Sprint 2 - Teams & Projects',
    goal: 'Implement teams, project management, and helper-based architecture.',
    status: SprintStatus.ACTIVE,
    startDate: '2026-01-16T00:00:00.000Z',
    endDate: '2026-01-31T23:59:59.000Z',
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    name: 'Sprint 3 - Tasks & Sprints',
    goal: 'Build agile task board, subtasks, dependencies, and sprint lifecycles.',
    status: SprintStatus.PLANNED,
    startDate: '2026-02-01T00:00:00.000Z',
    endDate: '2026-02-15T23:59:59.000Z',
  },

  // --- Acme Cloud Gateway Sprints ---
  {
    orgSlug: 'acme-corp',
    projectKey: 'ACME',
    name: 'Sprint 1 - Gateway Architecture',
    goal: 'Configure edge routing rules and API proxy microservices.',
    status: SprintStatus.ACTIVE,
    startDate: '2026-01-15T00:00:00.000Z',
    endDate: '2026-02-05T23:59:59.000Z',
  },
];

export const SEED_TASKS: SeedTaskDefinition[] = [
  // --- Nexora Platform Core Tasks ---
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'owner@nexora.app',
    title: 'Implement Multi-Tenant JWT Authentication',
    description:
      'Support user registration, password hashing with Argon2, JWT token issuance, and refresh session management.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    position: 1,
    dueDate: '2026-01-10T00:00:00.000Z',
    sprintName: 'Sprint 1 - Foundation & Auth',
    assigneeEmails: ['lead.dev@nexora.app', 'dev@nexora.app'],
    labelNames: ['Feature', 'Backend', 'High Priority'],
    comments: [
      {
        authorEmail: 'owner@nexora.app',
        content: 'Ensure refresh tokens are stored securely with session hashing.',
      },
      {
        authorEmail: 'lead.dev@nexora.app',
        content: 'JWT guards and passport strategies implemented with tests passing.',
      },
    ],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'lead.dev@nexora.app',
    title: 'Configure NestJS GraphQL Schema & Apollo Context',
    description:
      'Set up code-first schema generation, custom auth decorators, and global response filters for GraphQL.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    position: 2,
    dueDate: '2026-01-14T00:00:00.000Z',
    sprintName: 'Sprint 1 - Foundation & Auth',
    assigneeEmails: ['dev@nexora.app'],
    labelNames: ['Backend'],
    comments: [
      {
        authorEmail: 'qa@nexora.app',
        content: 'Verified GraphQL context properly forwards user session IDs.',
      },
    ],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'lead.dev@nexora.app',
    title: 'Build Team & Membership Management API',
    description:
      'Implement Team CRUD, team memberships, and team-level access control guards.',
    status: TaskStatus.IN_REVIEW,
    priority: TaskPriority.HIGH,
    position: 3,
    dueDate: '2026-01-25T00:00:00.000Z',
    sprintName: 'Sprint 2 - Teams & Projects',
    assigneeEmails: ['dev@nexora.app'],
    labelNames: ['Feature', 'Backend'],
    comments: [
      {
        authorEmail: 'lead.dev@nexora.app',
        content: 'PR submitted. Please review the helper hydration optimizations.',
      },
    ],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'owner@nexora.app',
    title: 'Design Task & Sprint Management Engine',
    description:
      'Build end-to-end task tracking, subtasks, assignments, comments, dependencies, and sprint lifecycle management.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.URGENT,
    position: 4,
    dueDate: '2026-01-30T00:00:00.000Z',
    sprintName: 'Sprint 2 - Teams & Projects',
    assigneeEmails: ['lead.dev@nexora.app'],
    labelNames: ['Feature', 'Backend', 'High Priority'],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'lead.dev@nexora.app',
    title: 'Implement Task Dependency Cycle Detection',
    description:
      'Prevent recursive or circular blocker relationships when creating task dependencies.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    position: 4.1,
    parentTaskTitle: 'Design Task & Sprint Management Engine',
    assigneeEmails: ['dev@nexora.app'],
    labelNames: ['Backend'],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'lead.dev@nexora.app',
    title: 'Add Automated Tests for Task & Sprint Resolvers',
    description:
      'Write comprehensive unit and integration tests covering GraphQL queries, mutations, and permissions.',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    position: 4.2,
    parentTaskTitle: 'Design Task & Sprint Management Engine',
    assigneeEmails: ['qa@nexora.app'],
    labelNames: ['Backend'],
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    creatorEmail: 'owner@nexora.app',
    title: 'Implement Realtime WebSocket Subscriptions for Task Board',
    description:
      'Broadcast task movements, status changes, and new comments over GraphQL subscriptions in real time.',
    status: TaskStatus.BACKLOG,
    priority: TaskPriority.MEDIUM,
    position: 5,
    sprintName: 'Sprint 3 - Tasks & Sprints',
    assigneeEmails: [],
    labelNames: ['Feature', 'Backend'],
  },

  // --- Acme Corporation Tasks ---
  {
    orgSlug: 'acme-corp',
    projectKey: 'ACME',
    creatorEmail: 'admin@nexora.app',
    title: 'Set up Multi-Region Edge Gateway Routing',
    description:
      'Configure latency-based routing policies and automated failover across US and EU edge clusters.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.URGENT,
    position: 1,
    dueDate: '2026-01-28T00:00:00.000Z',
    sprintName: 'Sprint 1 - Gateway Architecture',
    assigneeEmails: ['lead.dev@nexora.app'],
    labelNames: ['Cloud Infrastructure', 'Urgent'],
  },
  {
    orgSlug: 'acme-corp',
    projectKey: 'ACME',
    creatorEmail: 'lead.dev@nexora.app',
    title: 'Implement Gateway Rate Limiting & Token Bucket Filter',
    description:
      'Protect downstream microservices from traffic spikes with Redis-backed rate limiting.',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    position: 2,
    dueDate: '2026-02-02T00:00:00.000Z',
    sprintName: 'Sprint 1 - Gateway Architecture',
    assigneeEmails: ['dev@nexora.app'],
    labelNames: ['Security', 'Performance'],
  },
];

export const SEED_DEPENDENCIES: SeedDependencyDefinition[] = [
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    taskTitle: 'Build Team & Membership Management API',
    dependsOnTaskTitle: 'Implement Multi-Tenant JWT Authentication',
    type: DependencyType.BLOCKS,
  },
  {
    orgSlug: 'nexora-labs',
    projectKey: 'NEX',
    taskTitle: 'Design Task & Sprint Management Engine',
    dependsOnTaskTitle: 'Build Team & Membership Management API',
    type: DependencyType.BLOCKS,
  },
  {
    orgSlug: 'acme-corp',
    projectKey: 'ACME',
    taskTitle: 'Implement Gateway Rate Limiting & Token Bucket Filter',
    dependsOnTaskTitle: 'Set up Multi-Region Edge Gateway Routing',
    type: DependencyType.BLOCKS,
  },
];

export interface SeededTaskResult {
  labels: any[];
  sprints: any[];
  tasks: any[];
  assigneesCount: number;
  taskLabelsCount: number;
  commentsCount: number;
  dependenciesCount: number;
}

export async function seedTasks(
  seededUsers?: SeededUserRecord[],
  seededOrgs?: SeededOrganizationResult,
  seededProjects?: SeededProjectResult,
): Promise<SeededTaskResult> {
  const users = seededUsers || (await seedUsers());
  const orgsResult = seededOrgs || (await seedOrganizations());
  const projectsResult = seededProjects || (await seedProjects());

  const labelModel = getOrmModel('Label');
  const taskLabelModel = getOrmModel('TaskLabel');
  const sprintModel = getOrmModel('Sprint');
  const sprintTaskModel = getOrmModel('SprintTask');
  const taskModel = getOrmModel('Task');
  const taskAssigneeModel = getOrmModel('TaskAssignee');
  const taskCommentModel = getOrmModel('TaskComment');
  const taskDependencyModel = getOrmModel('TaskDependency');

  const now = new Date().toISOString();

  // Maps for lookups
  const userMap = new Map<string, any>();
  for (const u of users) {
    userMap.set(u.email.toLowerCase().trim(), u);
  }

  const orgMap = new Map<string, any>();
  for (const org of orgsResult.organizations) {
    if (org.slug) orgMap.set(org.slug.toLowerCase().trim(), org);
  }

  const projectMap = new Map<string, any>();
  for (const proj of projectsResult.projects) {
    const key = `${proj.organizationId}:${proj.key.toUpperCase()}`;
    projectMap.set(key, proj);
  }

  // 1. Seed Labels
  const existingLabels = await labelModel.all();
  const labelMap = new Map<string, any>();
  for (const l of existingLabels || []) {
    labelMap.set(`${l.organizationId}:${l.name.toLowerCase()}`, l);
  }

  const seededLabels: any[] = [];
  for (const seedLabel of SEED_LABELS) {
    const org = orgMap.get(seedLabel.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const key = `${org.id}:${seedLabel.name.toLowerCase()}`;
    let label = labelMap.get(key);
    if (!label) {
      label = await labelModel.create({
        pubId: generatePubId('lbl'),
        organizationId: org.id,
        name: seedLabel.name,
        color: seedLabel.color,
      });
      labelMap.set(key, label);
      logger.success(`Created label "${label.name}" for org "${org.slug}"`);
    }
    seededLabels.push(label);
  }

  // 2. Seed Sprints
  const existingSprints = await sprintModel.all();
  const sprintMap = new Map<string, any>();
  for (const s of existingSprints || []) {
    sprintMap.set(`${s.projectId}:${s.name.toLowerCase()}`, s);
  }

  const seededSprints: any[] = [];
  for (const seedSprint of SEED_SPRINTS) {
    const org = orgMap.get(seedSprint.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const projectKey = `${org.id}:${seedSprint.projectKey.toUpperCase()}`;
    const project = projectMap.get(projectKey);
    if (!project) continue;

    const sprintKey = `${project.id}:${seedSprint.name.toLowerCase()}`;
    let sprint = sprintMap.get(sprintKey);
    if (!sprint) {
      sprint = await sprintModel.create({
        pubId: generatePubId('spn'),
        projectId: project.id,
        name: seedSprint.name,
        goal: seedSprint.goal,
        status: seedSprint.status,
        startDate: seedSprint.startDate,
        endDate: seedSprint.endDate,
        createdAt: now,
        updatedAt: now,
      });
      sprintMap.set(sprintKey, sprint);
      logger.success(
        `Created sprint "${sprint.name}" for project "${project.name}" [${project.key}]`,
      );
    }
    seededSprints.push(sprint);
  }

  // 3. Seed Tasks (top-level tasks first, then subtasks)
  const existingTasks = await taskModel.all();
  const taskMap = new Map<string, any>();
  for (const t of existingTasks || []) {
    taskMap.set(`${t.projectId}:${t.title.toLowerCase()}`, t);
  }

  const seededTasks: any[] = [];
  let assigneesCount = 0;
  let taskLabelsCount = 0;
  let commentsCount = 0;

  // Process top-level tasks first
  const topLevelTasks = SEED_TASKS.filter((t) => !t.parentTaskTitle);
  const subTasks = SEED_TASKS.filter((t) => t.parentTaskTitle);
  const allOrderedTasks = [...topLevelTasks, ...subTasks];

  for (const seedTask of allOrderedTasks) {
    const org = orgMap.get(seedTask.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const projectKey = `${org.id}:${seedTask.projectKey.toUpperCase()}`;
    const project = projectMap.get(projectKey);
    if (!project) continue;

    const creator = userMap.get(seedTask.creatorEmail.toLowerCase().trim());
    if (!creator) continue;

    let parentTaskId: number | null = null;
    if (seedTask.parentTaskTitle) {
      const parentKey = `${project.id}:${seedTask.parentTaskTitle.toLowerCase()}`;
      const parent = taskMap.get(parentKey);
      if (parent) parentTaskId = parent.id;
    }

    const taskKey = `${project.id}:${seedTask.title.toLowerCase()}`;
    let task = taskMap.get(taskKey);

    if (!task) {
      task = await taskModel.create({
        pubId: generatePubId('tsk'),
        projectId: project.id,
        createdById: creator.id,
        parentTaskId,
        title: seedTask.title,
        description: seedTask.description,
        status: seedTask.status,
        priority: seedTask.priority,
        position: seedTask.position,
        dueDate: seedTask.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      taskMap.set(taskKey, task);
      logger.success(
        `Created task "${task.title}" [${task.status}] for project "${project.key}"`,
      );
    }
    seededTasks.push(task);

    // Assignees
    for (const email of seedTask.assigneeEmails) {
      const user = userMap.get(email.toLowerCase().trim());
      if (!user) continue;

      const existingAssignee = await taskAssigneeModel
        .where((a: any) => a.taskId.eq(task.id))
        .all();
      if (!existingAssignee?.some((a: any) => a.userId === user.id)) {
        await taskAssigneeModel.create({
          pubId: generatePubId('tsa'),
          taskId: task.id,
          userId: user.id,
          assignedAt: now,
        });
        assigneesCount++;
      }
    }

    // Task Labels
    for (const labelName of seedTask.labelNames) {
      const labelKey = `${org.id}:${labelName.toLowerCase()}`;
      const label = labelMap.get(labelKey);
      if (!label) continue;

      const existingTaskLabels = await taskLabelModel
        .where((tl: any) => tl.taskId.eq(task.id))
        .all();
      if (!existingTaskLabels?.some((tl: any) => tl.labelId === label.id)) {
        await taskLabelModel.create({
          pubId: generatePubId('tsl'),
          taskId: task.id,
          labelId: label.id,
        });
        taskLabelsCount++;
      }
    }

    // Sprint association
    if (seedTask.sprintName) {
      const sprintKey = `${project.id}:${seedTask.sprintName.toLowerCase()}`;
      const sprint = sprintMap.get(sprintKey);
      if (sprint) {
        const existingSprintTasks = await sprintTaskModel
          .where((st: any) => st.sprintId.eq(sprint.id))
          .all();
        if (!existingSprintTasks?.some((st: any) => st.taskId === task.id)) {
          await sprintTaskModel.create({
            pubId: generatePubId('spt'),
            sprintId: sprint.id,
            taskId: task.id,
          });
        }
      }
    }

    // Comments
    if (seedTask.comments && seedTask.comments.length > 0) {
      for (const comment of seedTask.comments) {
        const author = userMap.get(comment.authorEmail.toLowerCase().trim());
        if (!author) continue;

        const existingComments = await taskCommentModel
          .where((c: any) => c.taskId.eq(task.id))
          .all();
        const alreadyExists = existingComments?.some(
          (c: any) => c.authorId === author.id && c.content === comment.content,
        );

        if (!alreadyExists) {
          await taskCommentModel.create({
            pubId: generatePubId('tcm'),
            taskId: task.id,
            authorId: author.id,
            content: comment.content,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
          commentsCount++;
        }
      }
    }
  }

  // 4. Seed Dependencies
  let dependenciesCount = 0;
  for (const dep of SEED_DEPENDENCIES) {
    const org = orgMap.get(dep.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const projectKey = `${org.id}:${dep.projectKey.toUpperCase()}`;
    const project = projectMap.get(projectKey);
    if (!project) continue;

    const sourceTask = taskMap.get(
      `${project.id}:${dep.taskTitle.toLowerCase()}`,
    );
    const targetTask = taskMap.get(
      `${project.id}:${dep.dependsOnTaskTitle.toLowerCase()}`,
    );
    if (!sourceTask || !targetTask) continue;

    const existingDeps = await taskDependencyModel
      .where((d: any) => d.taskId.eq(sourceTask.id))
      .all();
    if (!existingDeps?.some((d: any) => d.dependsOnTaskId === targetTask.id)) {
      await taskDependencyModel.create({
        pubId: generatePubId('tdp'),
        taskId: sourceTask.id,
        dependsOnTaskId: targetTask.id,
        type: dep.type,
        createdAt: now,
      });
      dependenciesCount++;
      logger.success(
        `Added dependency: "${sourceTask.title}" -> "${targetTask.title}" [${dep.type}]`,
      );
    }
  }

  logger.success(
    `Task & Sprint seeding complete. Labels: ${seededLabels.length}, Sprints: ${seededSprints.length}, Tasks: ${seededTasks.length}, Assignees: ${assigneesCount}, Comments: ${commentsCount}, Dependencies: ${dependenciesCount}`,
  );

  return {
    labels: seededLabels,
    sprints: seededSprints,
    tasks: seededTasks,
    assigneesCount,
    taskLabelsCount,
    commentsCount,
    dependenciesCount,
  };
}
