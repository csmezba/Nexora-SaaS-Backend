import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectService } from '../../../src/project/project.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';
import { ProjectStatus } from '../../../src/project/enums/project-status.enum.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import * as UserHelper from '../../../src/user/user.helper.js';
import * as TeamHelper from '../../../src/team/team.helper.js';
import * as ProjectHelper from '../../../src/project/project.helper.js';

vi.mock('../../../src/organization/organization.helper.js', () => ({
  findByPubIdOrSlug: vi.fn(),
  findByOrgAndUser: vi.fn(),
  findOrgById: vi.fn(),
}));

vi.mock('../../../src/user/user.helper.js', () => ({
  findUserById: vi.fn(),
  findUserByPubId: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock('../../../src/team/team.helper.js', () => ({
  findTeamById: vi.fn(),
  findTeamByPubId: vi.fn(),
}));

vi.mock('../../../src/project/project.helper.js', () => ({
  getProjectModel: vi.fn(),
  getProjectMemberModel: vi.fn(),
  findProjectById: vi.fn(),
  findProjectByPubId: vi.fn(),
  findProjectByKeyAndOrg: vi.fn(),
  listProjectsByOrg: vi.fn(),
  listProjectsByTeam: vi.fn(),
  listProjectsByUser: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  findProjectMember: vi.fn(),
  listProjectMembers: vi.fn(),
  countProjectMembers: vi.fn(),
  addMemberToProject: vi.fn(),
  removeMemberFromProject: vi.fn(),
}));

describe('ProjectService', () => {
  let service: ProjectService;
  let mockPrisma: PrismaService;

  const sampleOrg = {
    id: 1,
    pubId: 'org_test1234567',
    name: 'Test Org',
    slug: 'test-org',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleMember = {
    id: 1,
    pubId: 'mem_12345678901',
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.ADMIN,
    joinedAt: new Date().toISOString(),
  };

  const sampleProject = {
    id: 100,
    pubId: 'prj_test1234567',
    organizationId: 1,
    teamId: null,
    createdById: 10,
    name: 'Nexora Web',
    key: 'NEX',
    description: 'Frontend and API',
    status: ProjectStatus.ACTIVE,
    startDate: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    memberCount: 1,
    members: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as PrismaService;
    service = new ProjectService(mockPrisma);
  });

  describe('createProject', () => {
    it('should create a project and auto-assign creator as member', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(ProjectHelper.findProjectByKeyAndOrg).mockResolvedValue(null);
      vi.mocked(ProjectHelper.createProject).mockResolvedValue(sampleProject);
      vi.mocked(ProjectHelper.findProjectById).mockResolvedValue(sampleProject);

      const result = await service.createProject(10, {
        organizationPubId: 'org_test1234567',
        name: 'Nexora Web',
        key: 'NEX',
      });

      expect(result.pubId).toBe(sampleProject.pubId);
      expect(result.key).toBe('NEX');
      expect(ProjectHelper.createProject).toHaveBeenCalled();
      expect(ProjectHelper.addMemberToProject).toHaveBeenCalledWith(
        mockPrisma,
        {
          projectId: sampleProject.id,
          userId: 10,
        },
      );
    });

    it('should throw ConflictException if project key already exists in org', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(ProjectHelper.findProjectByKeyAndOrg).mockResolvedValue(
        sampleProject,
      );

      await expect(
        service.createProject(10, {
          organizationPubId: 'org_test1234567',
          name: 'Nexora Web',
          key: 'NEX',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if user is not authorized to manage projects', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue({
        ...sampleMember,
        role: OrganizationRole.VIEWER,
      });

      await expect(
        service.createProject(10, {
          organizationPubId: 'org_test1234567',
          name: 'Nexora Web',
          key: 'NEX',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if assigned team belongs to another org', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(ProjectHelper.findProjectByKeyAndOrg).mockResolvedValue(null);
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue({
        id: 99,
        pubId: 'tem_other',
        organizationId: 999, // different org
        name: 'Other Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memberCount: 0,
        members: [],
      });

      await expect(
        service.createProject(10, {
          organizationPubId: 'org_test1234567',
          teamPubId: 'tem_other',
          name: 'Nexora Web',
          key: 'NEX',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if startDate is after dueDate', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(ProjectHelper.findProjectByKeyAndOrg).mockResolvedValue(null);

      await expect(
        service.createProject(10, {
          organizationPubId: 'org_test1234567',
          name: 'Nexora Web',
          key: 'NEX',
          startDate: new Date('2026-12-31'),
          dueDate: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProject', () => {
    it('should return project details when user belongs to parent org', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject,
      );
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(OrgHelper.findOrgById).mockResolvedValue(sampleOrg);

      const result = await service.getProject(sampleProject.pubId, 10);
      expect(result.pubId).toBe(sampleProject.pubId);
      expect(result.organizationPubId).toBe(sampleOrg.pubId);
    });

    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(null);

      await expect(service.getProject('prj_nonexistent', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addProjectMember', () => {
    const targetUser = {
      id: 20,
      pubId: 'usr_target12345',
      email: 'target@example.com',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should add member to project', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject,
      );
      vi.mocked(OrgHelper.findByOrgAndUser)
        .mockResolvedValueOnce(sampleMember) // caller check
        .mockResolvedValueOnce(sampleMember); // target user org check
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);
      vi.mocked(ProjectHelper.addMemberToProject).mockResolvedValue({
        pubId: 'prm_123',
        projectId: sampleProject.id,
        userId: targetUser.id,
        joinedAt: new Date().toISOString(),
      });

      const result = await service.addProjectMember(10, {
        projectPubId: sampleProject.pubId,
        userPubId: targetUser.pubId,
      });

      expect(result.success).toBe(true);
      expect(ProjectHelper.addMemberToProject).toHaveBeenCalledWith(
        mockPrisma,
        {
          projectId: sampleProject.id,
          userId: targetUser.id,
        },
      );
    });

    it('should throw BadRequestException if target user is not in parent organization', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject,
      );
      vi.mocked(OrgHelper.findByOrgAndUser)
        .mockResolvedValueOnce(sampleMember) // caller
        .mockResolvedValueOnce(null); // target user not in org
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);

      await expect(
        service.addProjectMember(10, {
          projectPubId: sampleProject.pubId,
          userPubId: targetUser.pubId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeProjectMember', () => {
    const targetUser = {
      id: 20,
      pubId: 'usr_target12345',
      email: 'target@example.com',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should remove member from project', async () => {
      vi.mocked(ProjectHelper.findProjectByPubId).mockResolvedValue(
        sampleProject,
      );
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(ProjectHelper.findProjectMember).mockResolvedValue({
        pubId: 'prm_123',
        projectId: sampleProject.id,
        userId: targetUser.id,
        joinedAt: new Date().toISOString(),
      });
      vi.mocked(ProjectHelper.removeMemberFromProject).mockResolvedValue(true);

      const result = await service.removeProjectMember(10, {
        projectPubId: sampleProject.pubId,
        userPubId: targetUser.pubId,
      });

      expect(result.success).toBe(true);
      expect(ProjectHelper.removeMemberFromProject).toHaveBeenCalledWith(
        mockPrisma,
        sampleProject.id,
        targetUser.id,
      );
    });
  });
});
