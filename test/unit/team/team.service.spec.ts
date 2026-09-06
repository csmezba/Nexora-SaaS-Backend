import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TeamService } from '../../../src/team/team.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import * as UserHelper from '../../../src/user/user.helper.js';
import * as TeamHelper from '../../../src/team/team.helper.js';

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
  getTeamModel: vi.fn(),
  getTeamMemberModel: vi.fn(),
  findTeamById: vi.fn(),
  findTeamByPubId: vi.fn(),
  findTeamByNameAndOrg: vi.fn(),
  listTeamsByOrg: vi.fn(),
  listTeamsByUser: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  findTeamMember: vi.fn(),
  listTeamMembers: vi.fn(),
  countTeamMembers: vi.fn(),
  addMemberToTeam: vi.fn(),
  removeMemberFromTeam: vi.fn(),
}));

describe('TeamService', () => {
  let service: TeamService;
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

  const sampleTeam = {
    id: 100,
    pubId: 'tem_test1234567',
    organizationId: 1,
    name: 'Core Engineering',
    description: 'Core backend and infrastructure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    memberCount: 1,
    members: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as PrismaService;
    service = new TeamService(mockPrisma);
  });

  describe('createTeam', () => {
    it('should create a team when user is ADMIN', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(TeamHelper.findTeamByNameAndOrg).mockResolvedValue(null);
      vi.mocked(TeamHelper.createTeam).mockResolvedValue(sampleTeam);
      vi.mocked(TeamHelper.findTeamById).mockResolvedValue(sampleTeam);

      const result = await service.createTeam(10, {
        organizationPubId: 'org_test1234567',
        name: 'Core Engineering',
        description: 'Core backend and infrastructure',
      });

      expect(result.pubId).toBe(sampleTeam.pubId);
      expect(result.name).toBe('Core Engineering');
      expect(TeamHelper.createTeam).toHaveBeenCalled();
    });

    it('should throw ConflictException if team name already exists', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(TeamHelper.findTeamByNameAndOrg).mockResolvedValue(sampleTeam);

      await expect(
        service.createTeam(10, {
          organizationPubId: 'org_test1234567',
          name: 'Core Engineering',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if user is not OWNER/ADMIN/MANAGER', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue({
        ...sampleMember,
        role: OrganizationRole.VIEWER,
      });

      await expect(
        service.createTeam(10, {
          organizationPubId: 'org_test1234567',
          name: 'New Team',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTeam', () => {
    it('should return team details when user is org member', async () => {
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue(sampleTeam);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(OrgHelper.findOrgById).mockResolvedValue(sampleOrg);

      const result = await service.getTeam(sampleTeam.pubId, 10);
      expect(result.pubId).toBe(sampleTeam.pubId);
      expect(result.organizationPubId).toBe(sampleOrg.pubId);
    });

    it('should throw NotFoundException if team not found', async () => {
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue(null);

      await expect(service.getTeam('tem_nonexistent', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTeamMember', () => {
    const targetUser = {
      id: 20,
      pubId: 'usr_target12345',
      email: 'target@example.com',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should add member to team when valid', async () => {
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue(sampleTeam);
      vi.mocked(OrgHelper.findByOrgAndUser)
        .mockResolvedValueOnce(sampleMember) // for caller check
        .mockResolvedValueOnce(sampleMember); // for target user check
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);
      vi.mocked(TeamHelper.addMemberToTeam).mockResolvedValue({
        pubId: 'tmm_123',
        teamId: sampleTeam.id,
        userId: targetUser.id,
        joinedAt: new Date().toISOString(),
      });

      const result = await service.addTeamMember(10, {
        teamPubId: sampleTeam.pubId,
        userPubId: targetUser.pubId,
      });

      expect(result.success).toBe(true);
      expect(TeamHelper.addMemberToTeam).toHaveBeenCalledWith(mockPrisma, {
        teamId: sampleTeam.id,
        userId: targetUser.id,
      });
    });

    it('should throw BadRequestException if target user is not in organization', async () => {
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue(sampleTeam);
      vi.mocked(OrgHelper.findByOrgAndUser)
        .mockResolvedValueOnce(sampleMember) // caller
        .mockResolvedValueOnce(null); // target user not in org
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);

      await expect(
        service.addTeamMember(10, {
          teamPubId: sampleTeam.pubId,
          userPubId: targetUser.pubId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeTeamMember', () => {
    const targetUser = {
      id: 20,
      pubId: 'usr_target12345',
      email: 'target@example.com',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('should remove member from team', async () => {
      vi.mocked(TeamHelper.findTeamByPubId).mockResolvedValue(sampleTeam);
      vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(targetUser);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleMember);
      vi.mocked(TeamHelper.findTeamMember).mockResolvedValue({
        pubId: 'tmm_123',
        teamId: sampleTeam.id,
        userId: targetUser.id,
        joinedAt: new Date().toISOString(),
      });
      vi.mocked(TeamHelper.removeMemberFromTeam).mockResolvedValue(true);

      const result = await service.removeTeamMember(10, {
        teamPubId: sampleTeam.pubId,
        userPubId: targetUser.pubId,
      });

      expect(result.success).toBe(true);
      expect(TeamHelper.removeMemberFromTeam).toHaveBeenCalledWith(
        mockPrisma,
        sampleTeam.id,
        targetUser.id,
      );
    });
  });
});
