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
import { OrganizationRole } from './enums/organization-role.enum.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import {
  CreateOrganizationInput,
  DeleteOrganizationResponseDto,
  OrganizationResponseDto,
  UpdateOrganizationInput,
} from './dto/organization.dto.js';
import {
  AddOrganizationMemberInput,
  MemberActionResponseDto,
  OrganizationMemberResponseDto,
  RemoveMemberInput,
  UpdateMemberRoleInput,
} from './dto/organization-member.dto.js';
import { UserResponseDto } from '../auth/dto/auth.dto.js';
import * as OrgHelper from './organization.helper.js';
import * as UserHelper from '../user/user.helper.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Organization Operations ---

  async createOrganization(
    userId: number,
    input: CreateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const memberModel = OrgHelper.getMemberModel(this.prisma);
      const slug = input.slug.toLowerCase().trim();

      const existing = await orgModel
        .where((o: { slug: { eq: (val: string) => unknown } }) =>
          o.slug.eq(slug),
        )
        .first();

      if (existing) {
        throw new ConflictException(
          `Organization slug '${slug}' is already taken`,
        );
      }

      const now = new Date().toISOString();
      const org = await orgModel.create({
        pubId: generatePubId('org'),
        name: input.name?.trim() || null,
        slug,
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await memberModel.create({
        pubId: generatePubId('mem'),
        organizationId: org.id,
        userId,
        role: OrganizationRole.OWNER,
        joinedAt: now,
      });

      return {
        id: org.id,
        pubId: org.pubId,
        name: org.name ?? null,
        slug: org.slug,
        logoUrl: org.logoUrl ?? null,
        description: org.description ?? null,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
        memberCount: 1,
        currentUserRole: OrganizationRole.OWNER,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in createOrganization: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while creating organization',
      );
    }
  }

  async getOrganizationByPubId(
    pubId: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const org = await orgModel
        .where((o: { pubId: { eq: (val: string) => unknown } }) =>
          o.pubId.eq(pubId.trim()),
        )
        .first();

      if (!org) {
        throw new NotFoundException(
          `Organization with pubId '${pubId}' not found`,
        );
      }

      const memberCount = await OrgHelper.countMembers(this.prisma, org.id);
      let currentUserRole: OrganizationRole | undefined;

      if (userId) {
        const membership = await OrgHelper.findByOrgAndUser(
          this.prisma,
          org.id,
          userId,
        );
        currentUserRole = membership?.role;
      }

      return {
        id: org.id,
        pubId: org.pubId,
        name: org.name ?? null,
        slug: org.slug,
        logoUrl: org.logoUrl ?? null,
        description: org.description ?? null,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
        memberCount,
        currentUserRole,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in getOrganizationByPubId: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching organization by pubId',
      );
    }
  }

  async getOrganizationBySlug(
    slug: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const org = await orgModel
        .where((o: { slug: { eq: (val: string) => unknown } }) =>
          o.slug.eq(slug.toLowerCase().trim()),
        )
        .first();

      if (!org) {
        throw new NotFoundException(
          `Organization with slug '${slug}' not found`,
        );
      }

      const memberCount = await OrgHelper.countMembers(this.prisma, org.id);
      let currentUserRole: OrganizationRole | undefined;

      if (userId) {
        const membership = await OrgHelper.findByOrgAndUser(
          this.prisma,
          org.id,
          userId,
        );
        currentUserRole = membership?.role;
      }

      return {
        id: org.id,
        pubId: org.pubId,
        name: org.name ?? null,
        slug: org.slug,
        logoUrl: org.logoUrl ?? null,
        description: org.description ?? null,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
        memberCount,
        currentUserRole,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in getOrganizationBySlug: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching organization by slug',
      );
    }
  }

  async getOrganization(
    identifier: string,
    userId?: number,
  ): Promise<OrganizationResponseDto> {
    try {
      const org = await OrgHelper.resolveOrganization(this.prisma, identifier);
      const memberCount = await OrgHelper.countMembers(this.prisma, org.id);
      let currentUserRole: OrganizationRole | undefined;

      if (userId) {
        const membership = await OrgHelper.findByOrgAndUser(
          this.prisma,
          org.id,
          userId,
        );
        currentUserRole = membership?.role;
      }

      return {
        id: org.id,
        pubId: org.pubId,
        name: org.name ?? null,
        slug: org.slug,
        logoUrl: org.logoUrl ?? null,
        description: org.description ?? null,
        createdAt: new Date(org.createdAt),
        updatedAt: new Date(org.updatedAt),
        memberCount,
        currentUserRole,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in getOrganization: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching organization',
      );
    }
  }

  async getUserOrganizations(
    userId: number,
  ): Promise<OrganizationResponseDto[]> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const memberModel = OrgHelper.getMemberModel(this.prisma);

      const userMemberships = await memberModel
        .where((m: { userId: { eq: (val: number) => unknown } }) =>
          m.userId.eq(userId),
        )
        .all();

      const results: OrganizationResponseDto[] = [];

      for (const membership of userMemberships || []) {
        const org = await orgModel.first({
          id: membership.organizationId,
        });
        if (org) {
          const memberCount = await OrgHelper.countMembers(this.prisma, org.id);
          results.push({
            id: org.id,
            pubId: org.pubId,
            name: org.name ?? null,
            slug: org.slug,
            logoUrl: org.logoUrl ?? null,
            description: org.description ?? null,
            createdAt: new Date(org.createdAt),
            updatedAt: new Date(org.updatedAt),
            memberCount,
            currentUserRole: membership.role,
          });
        }
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in getUserOrganizations: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching user organizations',
      );
    }
  }

  async updateOrganization(
    orgIdentifier: string,
    userId: number,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationResponseDto> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        orgIdentifier,
      );

      const membership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        userId,
      );
      if (
        !membership ||
        (membership.role !== OrganizationRole.OWNER &&
          membership.role !== OrganizationRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only organization owners and admins can update organization details',
        );
      }

      if (input.slug) {
        const newSlug = input.slug.toLowerCase().trim();
        if (newSlug !== org.slug) {
          const existing = await orgModel
            .where((o: { slug: { eq: (val: string) => unknown } }) =>
              o.slug.eq(newSlug),
            )
            .first();

          if (existing) {
            throw new ConflictException(
              `Organization slug '${newSlug}' is already taken`,
            );
          }
        }
      }

      const updatePayload: Record<string, unknown> = {};
      if (input.name !== undefined) updatePayload['name'] = input.name;
      if (input.slug !== undefined)
        updatePayload['slug'] = input.slug.toLowerCase().trim();
      if (input.logoUrl !== undefined)
        updatePayload['logoUrl'] = input.logoUrl;
      if (input.description !== undefined)
        updatePayload['description'] = input.description;
      updatePayload['updatedAt'] = new Date().toISOString();

      await orgModel.where({ id: org.id }).update(updatePayload);

      const updated = await orgModel.first({ id: org.id });
      if (!updated) {
        throw new NotFoundException('Organization not found after update');
      }

      const memberCount = await OrgHelper.countMembers(this.prisma, org.id);

      return {
        id: updated.id,
        pubId: updated.pubId,
        name: updated.name ?? null,
        slug: updated.slug,
        logoUrl: updated.logoUrl ?? null,
        description: updated.description ?? null,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
        memberCount,
        currentUserRole: membership.role,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in updateOrganization: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while updating organization',
      );
    }
  }

  async deleteOrganization(
    orgIdentifier: string,
    userId: number,
  ): Promise<DeleteOrganizationResponseDto> {
    try {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        orgIdentifier,
      );

      const membership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        userId,
      );
      if (!membership || membership.role !== OrganizationRole.OWNER) {
        throw new ForbiddenException(
          'Only the organization owner can delete the organization',
        );
      }

      await orgModel.where({ id: org.id }).delete();

      return {
        success: true,
        message: `Organization '${org.name || org.slug}' has been deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in deleteOrganization: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting organization',
      );
    }
  }

  // --- Member Operations ---

  async listMembers(
    orgIdentifier: string,
    userId: number,
  ): Promise<OrganizationMemberResponseDto[]> {
    try {
      const memberModel = OrgHelper.getMemberModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        orgIdentifier,
      );
      const membership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        userId,
      );
      if (!membership) {
        throw new ForbiddenException(
          'You must be a member to view the organization member list',
        );
      }

      const members = await memberModel
        .where(
          (m: { organizationId: { eq: (val: number) => unknown } }) =>
            m.organizationId.eq(org.id),
        )
        .all();

      const results: OrganizationMemberResponseDto[] = [];
      for (const m of members || []) {
        const user = await UserHelper.findUserById(this.prisma, m.userId);
        results.push({
          id: m.id,
          pubId: m.pubId,
          organizationId: m.organizationId,
          userId: m.userId,
          role: m.role,
          joinedAt: new Date(m.joinedAt),
          user: user ? this.toUserResponse(user) : undefined,
        });
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in listMembers: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing organization members',
      );
    }
  }

  async addMember(
    currentUserId: number,
    input: AddOrganizationMemberInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const memberModel = OrgHelper.getMemberModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        input.organizationId,
      );

      const callerMembership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        currentUserId,
      );
      if (
        !callerMembership ||
        (callerMembership.role !== OrganizationRole.OWNER &&
          callerMembership.role !== OrganizationRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only organization owners and admins can add new members',
        );
      }

      let targetUser: PrismaUserRecord | null = null;
      if (input.userId) {
        targetUser = await OrgHelper.resolveUser(
          this.prisma,
          input.userId,
        );
      } else if (input.email) {
        targetUser = await UserHelper.findUserByEmail(this.prisma, input.email);
      } else {
        throw new BadRequestException(
          'Either userId or email must be provided to add a member',
        );
      }

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      const existingMember = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        targetUser.id,
      );
      if (existingMember) {
        throw new ConflictException(
          'User is already a member of this organization',
        );
      }

      const role = input.role ?? OrganizationRole.MEMBER;
      if (
        role === OrganizationRole.OWNER &&
        callerMembership.role !== OrganizationRole.OWNER
      ) {
        throw new ForbiddenException('Only an owner can grant the OWNER role');
      }

      const now = new Date().toISOString();
      const newMember = await memberModel.create({
        pubId: generatePubId('mem'),
        organizationId: org.id,
        userId: targetUser.id,
        role,
        joinedAt: now,
      });

      return {
        success: true,
        message: `User '${targetUser.email}' added to organization successfully`,
        member: {
          id: newMember.id,
          pubId: newMember.pubId,
          organizationId: newMember.organizationId,
          userId: newMember.userId,
          role: newMember.role,
          joinedAt: new Date(newMember.joinedAt),
          user: this.toUserResponse(targetUser),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in addMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while adding organization member',
      );
    }
  }

  async updateMemberRole(
    currentUserId: number,
    input: UpdateMemberRoleInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const memberModel = OrgHelper.getMemberModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        input.organizationId,
      );

      const callerMembership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        currentUserId,
      );
      if (
        !callerMembership ||
        (callerMembership.role !== OrganizationRole.OWNER &&
          callerMembership.role !== OrganizationRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only organization owners and admins can update member roles',
        );
      }

      const targetUser = await OrgHelper.resolveUser(
        this.prisma,
        input.userId,
      );
      const targetMember = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        targetUser.id,
      );
      if (!targetMember) {
        throw new NotFoundException(
          'Target user is not a member of this organization',
        );
      }

      if (callerMembership.role === OrganizationRole.ADMIN) {
        if (targetMember.role === OrganizationRole.OWNER) {
          throw new ForbiddenException(
            'Admins cannot change the role of an Owner',
          );
        }
        if (input.role === OrganizationRole.OWNER) {
          throw new ForbiddenException('Admins cannot promote a member to Owner');
        }
      }

      if (
        targetMember.role === OrganizationRole.OWNER &&
        input.role !== OrganizationRole.OWNER
      ) {
        const allMembers = await memberModel
          .where(
            (m: { organizationId: { eq: (val: number) => unknown } }) =>
              m.organizationId.eq(org.id),
          )
          .all();
        const ownerCount = (allMembers || []).filter(
          (m) => m.role === OrganizationRole.OWNER,
        ).length;

        if (ownerCount <= 1) {
          throw new BadRequestException(
            'Cannot demote the only Owner of the organization. Transfer ownership or assign another Owner first.',
          );
        }
      }

      await memberModel
        .where({ id: targetMember.id })
        .update({ role: input.role });

      return {
        success: true,
        message: `Member role updated to ${input.role} successfully`,
        member: {
          id: targetMember.id,
          pubId: targetMember.pubId,
          organizationId: targetMember.organizationId,
          userId: targetMember.userId,
          role: input.role,
          joinedAt: new Date(targetMember.joinedAt),
          user: this.toUserResponse(targetUser),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in updateMemberRole: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while updating member role',
      );
    }
  }

  async removeMember(
    currentUserId: number,
    input: RemoveMemberInput,
  ): Promise<MemberActionResponseDto> {
    try {
      const memberModel = OrgHelper.getMemberModel(this.prisma);
      const org = await OrgHelper.resolveOrganization(
        this.prisma,
        input.organizationId,
      );

      const callerMembership = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        currentUserId,
      );
      if (!callerMembership) {
        throw new ForbiddenException(
          'You are not a member of this organization',
        );
      }

      const targetUser = await OrgHelper.resolveUser(
        this.prisma,
        input.userId,
      );
      const targetMember = await OrgHelper.findByOrgAndUser(
        this.prisma,
        org.id,
        targetUser.id,
      );
      if (!targetMember) {
        throw new NotFoundException(
          'Target user is not a member of this organization',
        );
      }

      const isSelf = currentUserId === targetUser.id;

      if (!isSelf) {
        if (
          callerMembership.role !== OrganizationRole.OWNER &&
          callerMembership.role !== OrganizationRole.ADMIN
        ) {
          throw new ForbiddenException(
            'Only owners and admins can remove other members',
          );
        }
        if (
          callerMembership.role === OrganizationRole.ADMIN &&
          targetMember.role === OrganizationRole.OWNER
        ) {
          throw new ForbiddenException(
            'Admins cannot remove an Owner from the organization',
          );
        }
      }

      if (targetMember.role === OrganizationRole.OWNER) {
        const allMembers = await memberModel
          .where(
            (m: { organizationId: { eq: (val: number) => unknown } }) =>
              m.organizationId.eq(org.id),
          )
          .all();
        const ownerCount = (allMembers || []).filter(
          (m) => m.role === OrganizationRole.OWNER,
        ).length;

        if (ownerCount <= 1) {
          throw new BadRequestException(
            'Cannot remove the sole Owner of the organization. Transfer ownership or delete the organization.',
          );
        }
      }

      await memberModel.where({ id: targetMember.id }).delete();

      return {
        success: true,
        message: isSelf
          ? 'Successfully left the organization'
          : 'Member has been removed from the organization',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in removeMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while removing member',
      );
    }
  }

  async leaveOrganization(
    userId: number,
    organizationPubId: string,
  ): Promise<MemberActionResponseDto> {
    try {
      const user = await UserHelper.findUserById(this.prisma, userId);
      return await this.removeMember(userId, {
        organizationId: organizationPubId,
        userId: user?.pubId ?? String(userId),
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in leaveOrganization: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while leaving organization',
      );
    }
  }

  private toUserResponse(user: PrismaUserRecord): UserResponseDto {
    const firstName = user.firstName ?? null;
    const lastName = user.lastName ?? null;
    const parts = [firstName, lastName].filter(Boolean);
    const fullName = parts.length > 0 ? parts.join(' ') : user.email;

    return {
      pubId: user.pubId,
      email: user.email,
      firstName,
      lastName,
      fullName,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }
}
