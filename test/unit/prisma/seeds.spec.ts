import { describe, expect, it, vi, beforeEach } from 'vitest';
import { db } from '../../../src/prisma/db.js';
import { seedUsers, SEED_USERS } from '../../../src/prisma/seeds/user.seed.js';
import {
  seedPermissions,
  SEED_PERMISSIONS,
} from '../../../src/prisma/seeds/permission.seed.js';
import {
  seedOrganizations,
  SEED_ORGANIZATIONS,
} from '../../../src/prisma/seeds/organization.seed.js';
import {
  seedRoles,
  SEED_ROLES,
} from '../../../src/prisma/seeds/role.seed.js';
import {
  seedAuth,
  SEED_OAUTH_ACCOUNTS,
} from '../../../src/prisma/seeds/auth.seed.js';
import {
  seedTeams,
  SEED_TEAMS,
} from '../../../src/prisma/seeds/team.seed.js';
import {
  seedProjects,
  SEED_PROJECTS,
} from '../../../src/prisma/seeds/project.seed.js';
import { runSeeds } from '../../../src/prisma/seeds/seed.js';

describe('Prisma Seed Modules', () => {
  let mockUserModel: any;
  let mockPermModel: any;
  let mockOrgModel: any;
  let mockMemberModel: any;
  let mockRoleModel: any;
  let mockRolePermModel: any;
  let mockMemberRoleModel: any;
  let mockTeamModel: any;
  let mockTeamMemberModel: any;
  let mockProjectModel: any;
  let mockProjectMemberModel: any;
  let mockSessionModel: any;
  let mockOAuthModel: any;

  beforeEach(() => {
    mockUserModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockPermModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockOrgModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockMemberModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockRoleModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockRolePermModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
        }),
      ),
    };

    mockMemberRoleModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
        }),
      ),
    };

    mockTeamModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockTeamMemberModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
        }),
      ),
    };

    mockProjectModel = {
      all: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
      }),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockProjectMemberModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
        }),
      ),
    };

    mockSessionModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    mockOAuthModel = {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: Math.floor(Math.random() * 1000) + 1,
          ...data,
        }),
      ),
    };

    // Attach mock models to db.orm
    (db as any).orm = {
      User: mockUserModel,
      Permission: mockPermModel,
      Organization: mockOrgModel,
      OrganizationMember: mockMemberModel,
      Role: mockRoleModel,
      RolePermission: mockRolePermModel,
      OrganizationMemberRole: mockMemberRoleModel,
      Team: mockTeamModel,
      TeamMember: mockTeamMemberModel,
      Project: mockProjectModel,
      ProjectMember: mockProjectMemberModel,
      UserSession: mockSessionModel,
      OAuthAccount: mockOAuthModel,
    };
  });

  describe('User Seed', () => {
    it('should create all seed users when none exist', async () => {
      const result = await seedUsers();

      expect(result).toHaveLength(SEED_USERS.length);
      expect(mockUserModel.create).toHaveBeenCalledTimes(SEED_USERS.length);
    });

    it('should be idempotent and skip already existing users', async () => {
      mockUserModel.all.mockResolvedValue([
        {
          id: 1,
          pubId: 'usr_existing1',
          email: 'admin@nexora.app',
          firstName: 'Alex',
          lastName: 'Rivers',
        },
      ]);

      const result = await seedUsers();

      expect(result).toHaveLength(SEED_USERS.length);
      expect(mockUserModel.create).toHaveBeenCalledTimes(SEED_USERS.length - 1);
    });
  });

  describe('Permission Seed', () => {
    it('should create all seed permissions when none exist', async () => {
      const result = await seedPermissions();

      expect(result).toHaveLength(SEED_PERMISSIONS.length);
      expect(mockPermModel.create).toHaveBeenCalledTimes(
        SEED_PERMISSIONS.length,
      );
    });

    it('should be idempotent and not duplicate existing permissions', async () => {
      mockPermModel.all.mockResolvedValue([
        {
          id: 1,
          pubId: 'perm_1',
          resource: 'user',
          action: 'create',
          description: 'Create new users',
        },
      ]);

      const result = await seedPermissions();

      expect(result).toHaveLength(SEED_PERMISSIONS.length);
      expect(mockPermModel.create).toHaveBeenCalledTimes(
        SEED_PERMISSIONS.length - 1,
      );
    });
  });

  describe('Organization Seed', () => {
    it('should create organizations and member assignments', async () => {
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );

      const result = await seedOrganizations();

      expect(result.organizations).toHaveLength(SEED_ORGANIZATIONS.length);
      expect(mockOrgModel.create).toHaveBeenCalledTimes(
        SEED_ORGANIZATIONS.length,
      );
      expect(mockMemberModel.create).toHaveBeenCalled();
    });

    it('should be idempotent when organizations already exist', async () => {
      mockOrgModel.all.mockResolvedValue([
        {
          id: 1,
          pubId: 'org_1',
          name: 'Nexora Labs',
          slug: 'nexora-labs',
        },
      ]);
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );

      const result = await seedOrganizations();

      expect(result.organizations).toHaveLength(SEED_ORGANIZATIONS.length);
      expect(mockOrgModel.create).toHaveBeenCalledTimes(
        SEED_ORGANIZATIONS.length - 1,
      );
    });
  });

  describe('Role Seed', () => {
    it('should create roles, role permissions, and member roles', async () => {
      mockOrgModel.all.mockResolvedValue([
        { id: 1, pubId: 'org_1', name: 'Nexora Labs', slug: 'nexora-labs' },
      ]);
      mockPermModel.all.mockResolvedValue(
        SEED_PERMISSIONS.map((p, i) => ({
          id: i + 1,
          pubId: `perm_${i + 1}`,
          resource: p.resource,
          action: p.action,
        })),
      );
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );
      mockMemberModel.all.mockResolvedValue([
        { id: 10, organizationId: 1, userId: 1 },
        { id: 11, organizationId: 1, userId: 2 },
      ]);

      const result = await seedRoles();

      expect(result.roles).toHaveLength(SEED_ROLES.length);
      expect(mockRoleModel.create).toHaveBeenCalledTimes(SEED_ROLES.length);
      expect(mockRolePermModel.create).toHaveBeenCalled();
    });
  });

  describe('Auth Seed', () => {
    it('should create sessions and OAuth account links', async () => {
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );

      const result = await seedAuth();

      expect(result.sessions.length).toBeGreaterThan(0);
      expect(result.oauthAccounts).toHaveLength(SEED_OAUTH_ACCOUNTS.length);
      expect(mockOAuthModel.create).toHaveBeenCalledTimes(
        SEED_OAUTH_ACCOUNTS.length,
      );
    });
  });

  describe('Team Seed', () => {
    it('should create teams and team member assignments', async () => {
      mockOrgModel.all.mockResolvedValue([
        { id: 1, pubId: 'org_1', name: 'Nexora Labs', slug: 'nexora-labs' },
        { id: 2, pubId: 'org_2', name: 'Acme Corporation', slug: 'acme-corp' },
      ]);
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );

      const result = await seedTeams();

      expect(result.teams).toHaveLength(SEED_TEAMS.length);
      expect(mockTeamModel.create).toHaveBeenCalledTimes(SEED_TEAMS.length);
      expect(mockTeamMemberModel.create).toHaveBeenCalled();
    });
  });

  describe('Project Seed', () => {
    it('should create projects and project member assignments', async () => {
      mockOrgModel.all.mockResolvedValue([
        { id: 1, pubId: 'org_1', name: 'Nexora Labs', slug: 'nexora-labs' },
        { id: 2, pubId: 'org_2', name: 'Acme Corporation', slug: 'acme-corp' },
      ]);
      mockUserModel.all.mockResolvedValue(
        SEED_USERS.map((u, i) => ({
          id: i + 1,
          pubId: `usr_${i + 1}`,
          email: u.email,
        })),
      );
      mockTeamModel.all.mockResolvedValue([
        { id: 1, organizationId: 1, name: 'Engineering' },
        { id: 2, organizationId: 1, name: 'Product & Design' },
        { id: 3, organizationId: 2, name: 'Platform Engineering' },
        { id: 4, organizationId: 2, name: 'Solutions Delivery' },
      ]);

      const result = await seedProjects();

      expect(result.projects).toHaveLength(SEED_PROJECTS.length);
      expect(mockProjectModel.create).toHaveBeenCalledTimes(
        SEED_PROJECTS.length,
      );
      expect(mockProjectMemberModel.create).toHaveBeenCalled();
    });
  });

  describe('Seed Runner (runSeeds)', () => {
    it('should run individual target seeds', async () => {
      await expect(runSeeds('user')).resolves.not.toThrow();
      await expect(runSeeds('permission')).resolves.not.toThrow();
      await expect(runSeeds('organization')).resolves.not.toThrow();
      await expect(runSeeds('role')).resolves.not.toThrow();
      await expect(runSeeds('auth')).resolves.not.toThrow();
      await expect(runSeeds('team')).resolves.not.toThrow();
      await expect(runSeeds('project')).resolves.not.toThrow();
    });

    it('should run full suite when target is "all"', async () => {
      await expect(runSeeds('all')).resolves.not.toThrow();
    });

    it('should print help when target is "--help"', async () => {
      await expect(runSeeds('--help')).resolves.not.toThrow();
    });
  });
});
