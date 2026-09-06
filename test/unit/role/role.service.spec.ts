import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RoleService } from '../../../src/role/role.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import * as RoleHelper from '../../../src/role/role.helper.js';

vi.mock('../../../src/organization/organization.helper.js', () => ({
  findByPubIdOrSlug: vi.fn(),
  findByOrgAndUser: vi.fn(),
  findMemberByPubId: vi.fn(),
  countMembers: vi.fn(),
  resolveOrganization: vi.fn(),
  resolveUser: vi.fn(),
  getOrgModel: vi.fn(),
  getMemberModel: vi.fn(),
}));

vi.mock('../../../src/role/role.helper.js', () => ({
  getRoleModel: vi.fn(),
  getPermissionModel: vi.fn(),
  getRolePermissionModel: vi.fn(),
  getMemberRoleModel: vi.fn(),
  findRoleById: vi.fn(),
  findRoleByPubId: vi.fn(),
  findRoleByNameAndOrg: vi.fn(),
  findRoleByPubIdAndOrg: vi.fn(),
  findAllRolesByOrg: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  findPermissionById: vi.fn(),
  findPermissionByPubId: vi.fn(),
  findPermissionByResourceAndAction: vi.fn(),
  findAllPermissions: vi.fn(),
  findPermissionsByIds: vi.fn(),
  findPermissionsByPubIds: vi.fn(),
  createPermission: vi.fn(),
  updatePermission: vi.fn(),
  deletePermission: vi.fn(),
  getRolePermissions: vi.fn(),
  assignPermissionsToRole: vi.fn(),
  removePermissionsFromRole: vi.fn(),
  syncRolePermissions: vi.fn(),
  getMemberRoles: vi.fn(),
  assignRoleToMember: vi.fn(),
  removeRoleFromMember: vi.fn(),
}));

describe('RoleService', () => {
  let service: RoleService;
  let mockPrisma: PrismaService;

  const sampleOrg = {
    id: 1,
    pubId: 'org_abc123',
    name: 'Acme Corp',
    slug: 'acme',
    logoUrl: null,
    description: 'Test Org',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleOwnerMember = {
    id: 100,
    pubId: 'mem_own123',
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.OWNER,
    joinedAt: new Date(),
  };

  const sampleRegularMember = {
    id: 101,
    pubId: 'mem_reg456',
    organizationId: 1,
    userId: 20,
    role: OrganizationRole.MEMBER,
    joinedAt: new Date(),
  };

  const samplePerm = {
    id: 1,
    pubId: 'perm_proj_create',
    resource: 'project',
    action: 'create',
    description: 'Create projects',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleRole = {
    id: 5,
    pubId: 'rol_lead123',
    name: 'Lead Developer',
    description: 'Tech lead',
    organizationId: 1,
    permissions: [samplePerm],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as unknown as PrismaService;
    service = new RoleService(mockPrisma);
  });

  describe('createRole', () => {
    it('should create role successfully when caller is OWNER', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(RoleHelper.findRoleByNameAndOrg).mockResolvedValue(null);
      vi.mocked(RoleHelper.createRole).mockResolvedValue(sampleRole as any);
      vi.mocked(RoleHelper.findRoleById).mockResolvedValue(sampleRole as any);

      const result = await service.createRole(10, {
        organizationPubId: 'org_abc123',
        name: 'Lead Developer',
        description: 'Tech lead',
      });

      expect(result.pubId).toBe('rol_lead123');
      expect(result.name).toBe('Lead Developer');
    });

    it('should throw ForbiddenException when caller is not OWNER or ADMIN', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleRegularMember as any);

      await expect(
        service.createRole(20, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
        }),
      ).rejects.toThrowError(ForbiddenException);
    });

    it('should throw ConflictException if role name already exists in org', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(RoleHelper.findRoleByNameAndOrg).mockResolvedValue(sampleRole as any);

      await expect(
        service.createRole(10, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
        }),
      ).rejects.toThrowError(ConflictException);
    });

    it('should throw BadRequestException if invalid permission pubIds provided', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(RoleHelper.findRoleByNameAndOrg).mockResolvedValue(null);
      vi.mocked(RoleHelper.createRole).mockResolvedValue(sampleRole as any);
      vi.mocked(RoleHelper.findPermissionsByPubIds).mockResolvedValue([]);

      await expect(
        service.createRole(10, {
          organizationPubId: 'org_abc123',
          name: 'Lead Developer',
          permissionPubIds: ['perm_invalid'],
        }),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('should update role name and description', async () => {
      vi.mocked(RoleHelper.findRoleByPubId).mockResolvedValue(sampleRole as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(RoleHelper.findRoleByNameAndOrg).mockResolvedValue(null);
      vi.mocked(RoleHelper.updateRole).mockResolvedValue({
        ...sampleRole,
        name: 'Principal Developer',
        description: 'Principal',
      } as any);

      const result = await service.updateRole('rol_lead123', 10, {
        name: 'Principal Developer',
        description: 'Principal',
      });

      expect(result.name).toBe('Principal Developer');
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      vi.mocked(RoleHelper.findRoleByPubId).mockResolvedValue(sampleRole as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(RoleHelper.deleteRole).mockResolvedValue(true as any);

      const result = await service.deleteRole('rol_lead123', 10);
      expect(result.success).toBe(true);
    });
  });

  describe('permissions', () => {
    it('should create permission', async () => {
      vi.mocked(RoleHelper.findPermissionByResourceAndAction).mockResolvedValue(null);
      vi.mocked(RoleHelper.createPermission).mockResolvedValue(samplePerm as any);

      const result = await service.createPermission({
        resource: 'project',
        action: 'create',
        description: 'Create projects',
      });

      expect(result.pubId).toBe('perm_proj_create');
      expect(result.resource).toBe('project');
    });

    it('should throw ConflictException if permission already exists', async () => {
      vi.mocked(RoleHelper.findPermissionByResourceAndAction).mockResolvedValue(samplePerm as any);

      await expect(
        service.createPermission({
          resource: 'project',
          action: 'create',
        }),
      ).rejects.toThrowError(ConflictException);
    });

    it('should list permissions', async () => {
      vi.mocked(RoleHelper.findAllPermissions).mockResolvedValue([samplePerm] as any);

      const list = await service.listPermissions();
      expect(list.length).toBe(1);
      expect(list[0]!.pubId).toBe('perm_proj_create');
    });
  });

  describe('member role assignment', () => {
    it('should assign role to member', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(OrgHelper.findMemberByPubId).mockResolvedValue(sampleRegularMember as any);
      vi.mocked(RoleHelper.findRoleByPubIdAndOrg).mockResolvedValue(sampleRole as any);
      vi.mocked(RoleHelper.assignRoleToMember).mockResolvedValue({
        id: 1,
        pubId: 'omr_123',
        organizationMemberId: 101,
        roleId: 5,
        assignedAt: new Date(),
      } as any);

      const result = await service.assignRoleToMember(10, {
        organizationPubId: 'org_abc123',
        memberPubId: 'mem_reg456',
        rolePubId: 'rol_lead123',
      });

      expect(result.success).toBe(true);
      expect(result.role?.pubId).toBe('rol_lead123');
    });

    it('should remove role from member', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(sampleOrg as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(sampleOwnerMember as any);
      vi.mocked(OrgHelper.findMemberByPubId).mockResolvedValue(sampleRegularMember as any);
      vi.mocked(RoleHelper.findRoleByPubIdAndOrg).mockResolvedValue(sampleRole as any);
      vi.mocked(RoleHelper.removeRoleFromMember).mockResolvedValue(true as any);

      const result = await service.removeRoleFromMember(10, {
        organizationPubId: 'org_abc123',
        memberPubId: 'mem_reg456',
        rolePubId: 'rol_lead123',
      });

      expect(result.success).toBe(true);
    });
  });
});
