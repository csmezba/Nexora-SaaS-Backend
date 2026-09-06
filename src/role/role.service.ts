import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationRole } from '../organization/enums/organization-role.enum.js';
import * as OrgHelper from '../organization/organization.helper.js';
import * as RoleHelper from './role.helper.js';
import type {
  AssignPermissionsInput,
  AssignRoleToMemberInput,
  CreateRoleInput,
  DeleteRoleResponseDto,
  RemoveRoleFromMemberInput,
  RoleActionResponseDto,
  RoleResponseDto,
  UpdateRoleInput,
} from './dto/role.dto.js';
import type {
  CreatePermissionInput,
  DeletePermissionResponseDto,
  PermissionResponseDto,
  UpdatePermissionInput,
} from './dto/permission.dto.js';
import type {
  PrismaPermissionRecord,
  PrismaRoleRecord,
} from './types/role.types.js';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganization(pubIdOrSlug: string) {
    const org = await OrgHelper.findByPubIdOrSlug(this.prisma, pubIdOrSlug);
    if (!org) {
      throw new NotFoundException(`Organization '${pubIdOrSlug}' not found`);
    }
    return org;
  }

  private async ensureAdminOrOwner(organizationId: number, userId: number) {
    const member = await OrgHelper.findByOrgAndUser(
      this.prisma,
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    if (
      member.role !== OrganizationRole.OWNER &&
      member.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization OWNER or ADMIN can perform this action',
      );
    }
    return member;
  }

  private async ensureMember(organizationId: number, userId: number) {
    const member = await OrgHelper.findByOrgAndUser(
      this.prisma,
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return member;
  }

  // --- Role Management ---

  async createRole(
    userId: number,
    input: CreateRoleInput,
  ): Promise<RoleResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationPubId);
      await this.ensureAdminOrOwner(org.id, userId);

      const existingRole = await RoleHelper.findRoleByNameAndOrg(
        this.prisma,
        org.id,
        input.name,
      );
      if (existingRole) {
        throw new ConflictException(
          `Role with name '${input.name}' already exists in this organization`,
        );
      }

      const role = await RoleHelper.createRole(this.prisma, {
        name: input.name,
        description: input.description,
        organizationId: org.id,
      });

      if (input.permissionPubIds && input.permissionPubIds.length > 0) {
        const permissions = await RoleHelper.findPermissionsByPubIds(
          this.prisma,
          input.permissionPubIds,
        );
        if (permissions.length !== input.permissionPubIds.length) {
          throw new BadRequestException('One or more permission IDs are invalid');
        }
        await RoleHelper.syncRolePermissions(
          this.prisma,
          role.id,
          permissions.map((p) => p.id),
        );
      }

      const created = await RoleHelper.findRoleById(this.prisma, role.id);
      if (!created) {
        throw new NotFoundException('Role could not be retrieved after creation');
      }

      return this.toRoleResponse(created);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in createRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while creating role',
      );
    }
  }

  async updateRole(
    pubId: string,
    userId: number,
    input: UpdateRoleInput,
  ): Promise<RoleResponseDto> {
    try {
      const role = await RoleHelper.findRoleByPubId(this.prisma, pubId);
      if (!role) {
        throw new NotFoundException(`Role with ID '${pubId}' not found`);
      }

      await this.ensureAdminOrOwner(role.organizationId, userId);

      if (input.name && input.name !== role.name) {
        const existing = await RoleHelper.findRoleByNameAndOrg(
          this.prisma,
          role.organizationId,
          input.name,
        );
        if (existing && existing.id !== role.id) {
          throw new ConflictException(
            `Role with name '${input.name}' already exists in this organization`,
          );
        }
      }

      const updated = await RoleHelper.updateRole(this.prisma, role.id, {
        name: input.name,
        description: input.description,
      });

      if (!updated) {
        throw new NotFoundException('Role could not be retrieved after update');
      }

      return this.toRoleResponse(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in updateRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while updating role',
      );
    }
  }

  async deleteRole(
    pubId: string,
    userId: number,
  ): Promise<DeleteRoleResponseDto> {
    try {
      const role = await RoleHelper.findRoleByPubId(this.prisma, pubId);
      if (!role) {
        throw new NotFoundException(`Role with ID '${pubId}' not found`);
      }

      await this.ensureAdminOrOwner(role.organizationId, userId);

      await RoleHelper.deleteRole(this.prisma, role.id);

      return {
        success: true,
        message: `Role '${role.name}' deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in deleteRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting role',
      );
    }
  }

  async getRole(pubId: string, userId: number): Promise<RoleResponseDto> {
    try {
      const role = await RoleHelper.findRoleByPubId(this.prisma, pubId);
      if (!role) {
        throw new NotFoundException(`Role with ID '${pubId}' not found`);
      }

      await this.ensureMember(role.organizationId, userId);

      return this.toRoleResponse(role);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in getRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching role',
      );
    }
  }

  async listRoles(
    organizationPubId: string,
    userId: number,
  ): Promise<RoleResponseDto[]> {
    try {
      const org = await this.resolveOrganization(organizationPubId);
      await this.ensureMember(org.id, userId);

      const roles = await RoleHelper.findAllRolesByOrg(this.prisma, org.id);
      return roles.map((r) => this.toRoleResponse(r));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listRoles: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing roles',
      );
    }
  }

  // --- Permission Management ---

  async createPermission(
    input: CreatePermissionInput,
  ): Promise<PermissionResponseDto> {
    try {
      const existing = await RoleHelper.findPermissionByResourceAndAction(
        this.prisma,
        input.resource,
        input.action,
      );
      if (existing) {
        throw new ConflictException(
          `Permission '${input.resource}:${input.action}' already exists`,
        );
      }

      const permission = await RoleHelper.createPermission(this.prisma, {
        resource: input.resource,
        action: input.action,
        description: input.description,
      });

      return this.toPermissionResponse(permission);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in createPermission: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while creating permission',
      );
    }
  }

  async updatePermission(
    pubId: string,
    input: UpdatePermissionInput,
  ): Promise<PermissionResponseDto> {
    try {
      const permission = await RoleHelper.findPermissionByPubId(
        this.prisma,
        pubId,
      );
      if (!permission) {
        throw new NotFoundException(`Permission with ID '${pubId}' not found`);
      }

      if (input.resource || input.action) {
        const targetResource = input.resource ?? permission.resource;
        const targetAction = input.action ?? permission.action;
        const existing = await RoleHelper.findPermissionByResourceAndAction(
          this.prisma,
          targetResource,
          targetAction,
        );
        if (existing && existing.id !== permission.id) {
          throw new ConflictException(
            `Permission '${targetResource}:${targetAction}' already exists`,
          );
        }
      }

      const updated = await RoleHelper.updatePermission(
        this.prisma,
        permission.id,
        {
          resource: input.resource,
          action: input.action,
          description: input.description,
        },
      );

      if (!updated) {
        throw new NotFoundException(
          'Permission could not be retrieved after update',
        );
      }

      return this.toPermissionResponse(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in updatePermission: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while updating permission',
      );
    }
  }

  async deletePermission(pubId: string): Promise<DeletePermissionResponseDto> {
    try {
      const permission = await RoleHelper.findPermissionByPubId(
        this.prisma,
        pubId,
      );
      if (!permission) {
        throw new NotFoundException(`Permission with ID '${pubId}' not found`);
      }

      await RoleHelper.deletePermission(this.prisma, permission.id);

      return {
        success: true,
        message: `Permission '${permission.resource}:${permission.action}' deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in deletePermission: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting permission',
      );
    }
  }

  async listPermissions(): Promise<PermissionResponseDto[]> {
    try {
      const permissions = await RoleHelper.findAllPermissions(this.prisma);
      return permissions.map((p) => this.toPermissionResponse(p));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listPermissions: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing permissions',
      );
    }
  }

  async assignPermissionsToRole(
    userId: number,
    input: AssignPermissionsInput,
  ): Promise<RoleResponseDto> {
    try {
      const role = await RoleHelper.findRoleByPubId(this.prisma, input.rolePubId);
      if (!role) {
        throw new NotFoundException(
          `Role with ID '${input.rolePubId}' not found`,
        );
      }

      await this.ensureAdminOrOwner(role.organizationId, userId);

      const permissions = await RoleHelper.findPermissionsByPubIds(
        this.prisma,
        input.permissionPubIds,
      );
      if (permissions.length !== input.permissionPubIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }

      await RoleHelper.syncRolePermissions(
        this.prisma,
        role.id,
        permissions.map((p) => p.id),
      );

      const updated = await RoleHelper.findRoleById(this.prisma, role.id);
      if (!updated) {
        throw new NotFoundException('Role could not be retrieved after update');
      }

      return this.toRoleResponse(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in assignPermissionsToRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while assigning permissions',
      );
    }
  }

  // --- Member Role Assignment ---

  async assignRoleToMember(
    userId: number,
    input: AssignRoleToMemberInput,
  ): Promise<RoleActionResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationPubId);
      await this.ensureAdminOrOwner(org.id, userId);

      const member = await OrgHelper.findMemberByPubId(
        this.prisma,
        input.memberPubId,
      );
      if (!member || member.organizationId !== org.id) {
        throw new NotFoundException('Organization member not found');
      }

      const role = await RoleHelper.findRoleByPubIdAndOrg(
        this.prisma,
        org.id,
        input.rolePubId,
      );
      if (!role) {
        throw new NotFoundException(
          `Role '${input.rolePubId}' not found in this organization`,
        );
      }

      await RoleHelper.assignRoleToMember(this.prisma, member.id, role.id);

      return {
        success: true,
        message: `Role '${role.name}' assigned to member successfully`,
        role: this.toRoleResponse(role),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in assignRoleToMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while assigning role to member',
      );
    }
  }

  async removeRoleFromMember(
    userId: number,
    input: RemoveRoleFromMemberInput,
  ): Promise<RoleActionResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationPubId);
      await this.ensureAdminOrOwner(org.id, userId);

      const member = await OrgHelper.findMemberByPubId(
        this.prisma,
        input.memberPubId,
      );
      if (!member || member.organizationId !== org.id) {
        throw new NotFoundException('Organization member not found');
      }

      const role = await RoleHelper.findRoleByPubIdAndOrg(
        this.prisma,
        org.id,
        input.rolePubId,
      );
      if (!role) {
        throw new NotFoundException(
          `Role '${input.rolePubId}' not found in this organization`,
        );
      }

      await RoleHelper.removeRoleFromMember(this.prisma, member.id, role.id);

      return {
        success: true,
        message: `Role '${role.name}' removed from member successfully`,
        role: this.toRoleResponse(role),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in removeRoleFromMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while removing role from member',
      );
    }
  }

  async getMemberRoles(
    organizationPubId: string,
    memberPubId: string,
    userId: number,
  ): Promise<RoleResponseDto[]> {
    try {
      const org = await this.resolveOrganization(organizationPubId);
      await this.ensureMember(org.id, userId);

      const member = await OrgHelper.findMemberByPubId(
        this.prisma,
        memberPubId,
      );
      if (!member || member.organizationId !== org.id) {
        throw new NotFoundException('Organization member not found');
      }

      const roles = await RoleHelper.getMemberRoles(this.prisma, member.id);
      return roles.map((r) => this.toRoleResponse(r));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in getMemberRoles: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching member roles',
      );
    }
  }

  // --- Helpers ---

  private toRoleResponse(
    role: PrismaRoleRecord & { permissions?: PrismaPermissionRecord[] },
  ): RoleResponseDto {
    return {
      id: role.id,
      pubId: role.pubId,
      name: role.name,
      description: role.description ?? null,
      organizationId: role.organizationId,
      permissions: (role.permissions || []).map((p) =>
        this.toPermissionResponse(p),
      ),
      createdAt: new Date(role.createdAt),
      updatedAt: new Date(role.updatedAt),
    };
  }

  private toPermissionResponse(
    permission: PrismaPermissionRecord,
  ): PermissionResponseDto {
    return {
      id: permission.id,
      pubId: permission.pubId,
      resource: permission.resource,
      action: permission.action,
      description: permission.description ?? null,
      createdAt: new Date(permission.createdAt),
      updatedAt: new Date(permission.updatedAt),
    };
  }
}
