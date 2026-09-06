import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationRole } from '../organization/enums/organization-role.enum.js';
import * as OrgHelper from '../organization/organization.helper.js';
import * as UserHelper from '../user/user.helper.js';
import * as TeamHelper from './team.helper.js';
import type {
  AddTeamMemberInput,
  CreateTeamInput,
  DeleteTeamResponseDto,
  RemoveTeamMemberInput,
  TeamActionResponseDto,
  TeamMemberResponseDto,
  TeamResponseDto,
  UpdateTeamInput,
} from './dto/team.dto.js';
import type {
  PrismaTeamMemberRecord,
  TeamWithDetails,
} from './types/team.types.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

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
      member.role !== OrganizationRole.ADMIN &&
      member.role !== OrganizationRole.MANAGER
    ) {
      throw new ForbiddenException(
        'Only organization OWNER, ADMIN, or MANAGER can perform this action',
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

  // --- Team Operations ---

  async createTeam(
    userId: number,
    input: CreateTeamInput,
  ): Promise<TeamResponseDto> {
    const org = await this.resolveOrganization(input.organizationPubId);
    await this.ensureAdminOrOwner(org.id, userId);

    const existingTeam = await TeamHelper.findTeamByNameAndOrg(
      this.prisma,
      org.id,
      input.name,
    );
    if (existingTeam) {
      throw new ConflictException(
        `Team with name '${input.name}' already exists in this organization`,
      );
    }

    const team = await TeamHelper.createTeam(this.prisma, {
      organizationId: org.id,
      name: input.name,
      description: input.description,
    });

    // Optionally add initial members
    if (input.initialMemberPubIds && input.initialMemberPubIds.length > 0) {
      for (const userPubId of input.initialMemberPubIds) {
        const user = await UserHelper.findUserByPubId(this.prisma, userPubId);
        if (!user) continue;

        // Verify user is an active organization member
        const orgMember = await OrgHelper.findByOrgAndUser(
          this.prisma,
          org.id,
          user.id,
        );
        if (orgMember) {
          await TeamHelper.addMemberToTeam(this.prisma, {
            teamId: team.id,
            userId: user.id,
          });
        }
      }
    }

    const refreshed = await TeamHelper.findTeamById(this.prisma, team.id);
    return this.toTeamResponseDto(refreshed ?? team, org.pubId);
  }

  async getTeam(pubId: string, userId: number): Promise<TeamResponseDto> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, pubId);
    if (!team) {
      throw new NotFoundException(`Team with ID '${pubId}' not found`);
    }

    await this.ensureMember(team.organizationId, userId);
    const org = await OrgHelper.findOrgById(this.prisma, team.organizationId);

    return this.toTeamResponseDto(team, org?.pubId || '');
  }

  async listOrganizationTeams(
    organizationPubId: string,
    userId: number,
  ): Promise<TeamResponseDto[]> {
    const org = await this.resolveOrganization(organizationPubId);
    await this.ensureMember(org.id, userId);

    const teams = await TeamHelper.listTeamsByOrg(this.prisma, org.id);
    return teams.map((team) => this.toTeamResponseDto(team, org.pubId));
  }

  async listUserTeams(
    userId: number,
    organizationPubId?: string,
  ): Promise<TeamResponseDto[]> {
    let orgId: number | undefined;
    let orgPubId = '';

    if (organizationPubId) {
      const org = await this.resolveOrganization(organizationPubId);
      await this.ensureMember(org.id, userId);
      orgId = org.id;
      orgPubId = org.pubId;
    }

    const teams = await TeamHelper.listTeamsByUser(this.prisma, userId, orgId);

    const responseList: TeamResponseDto[] = [];
    for (const team of teams) {
      let resolvedOrgPubId = orgPubId;
      if (!resolvedOrgPubId) {
        const parentOrg = await OrgHelper.findOrgById(
          this.prisma,
          team.organizationId,
        );
        resolvedOrgPubId = parentOrg?.pubId || '';
      }
      responseList.push(this.toTeamResponseDto(team, resolvedOrgPubId));
    }

    return responseList;
  }

  async updateTeam(
    pubId: string,
    userId: number,
    input: UpdateTeamInput,
  ): Promise<TeamResponseDto> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, pubId);
    if (!team) {
      throw new NotFoundException(`Team with ID '${pubId}' not found`);
    }

    await this.ensureAdminOrOwner(team.organizationId, userId);

    if (input.name && input.name.trim().toLowerCase() !== team.name.toLowerCase()) {
      const existing = await TeamHelper.findTeamByNameAndOrg(
        this.prisma,
        team.organizationId,
        input.name,
      );
      if (existing && existing.id !== team.id) {
        throw new ConflictException(
          `Team with name '${input.name}' already exists in this organization`,
        );
      }
    }

    const updated = await TeamHelper.updateTeam(this.prisma, team.id, input);
    if (!updated) {
      throw new NotFoundException(`Failed to update team '${pubId}'`);
    }

    const org = await OrgHelper.findOrgById(this.prisma, team.organizationId);
    return this.toTeamResponseDto(updated, org?.pubId || '');
  }

  async deleteTeam(
    pubId: string,
    userId: number,
  ): Promise<DeleteTeamResponseDto> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, pubId);
    if (!team) {
      throw new NotFoundException(`Team with ID '${pubId}' not found`);
    }

    await this.ensureAdminOrOwner(team.organizationId, userId);
    await TeamHelper.deleteTeam(this.prisma, team.id);

    return {
      success: true,
      message: `Team '${team.name}' successfully deleted`,
    };
  }

  // --- Team Member Operations ---

  async listTeamMembers(
    teamPubId: string,
    userId: number,
  ): Promise<TeamMemberResponseDto[]> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, teamPubId);
    if (!team) {
      throw new NotFoundException(`Team with ID '${teamPubId}' not found`);
    }

    await this.ensureMember(team.organizationId, userId);
    const members = await TeamHelper.listTeamMembers(this.prisma, team.id);

    return members.map((m) => this.toTeamMemberResponseDto(m, team.pubId));
  }

  async addTeamMember(
    userId: number,
    input: AddTeamMemberInput,
  ): Promise<TeamActionResponseDto> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, input.teamPubId);
    if (!team) {
      throw new NotFoundException(
        `Team with ID '${input.teamPubId}' not found`,
      );
    }

    await this.ensureAdminOrOwner(team.organizationId, userId);

    const targetUser = await this.resolveTargetUser(input.userPubId);
    if (!targetUser) {
      throw new NotFoundException(`User '${input.userPubId}' not found`);
    }

    // Target user must belong to the organization
    const orgMember = await OrgHelper.findByOrgAndUser(
      this.prisma,
      team.organizationId,
      targetUser.id,
    );
    if (!orgMember) {
      throw new BadRequestException(
        'Target user must be a member of the organization before joining a team',
      );
    }

    await TeamHelper.addMemberToTeam(this.prisma, {
      teamId: team.id,
      userId: targetUser.id,
    });

    return {
      success: true,
      message: `User successfully added to team '${team.name}'`,
    };
  }

  async removeTeamMember(
    userId: number,
    input: RemoveTeamMemberInput,
  ): Promise<TeamActionResponseDto> {
    const team = await TeamHelper.findTeamByPubId(this.prisma, input.teamPubId);
    if (!team) {
      throw new NotFoundException(
        `Team with ID '${input.teamPubId}' not found`,
      );
    }

    const targetUser = await this.resolveTargetUser(input.userPubId);
    if (!targetUser) {
      throw new NotFoundException(`User '${input.userPubId}' not found`);
    }

    // Either the user is removing themselves, or the caller is an admin/owner
    if (userId !== targetUser.id) {
      await this.ensureAdminOrOwner(team.organizationId, userId);
    }

    const membership = await TeamHelper.findTeamMember(
      this.prisma,
      team.id,
      targetUser.id,
    );
    if (!membership) {
      throw new NotFoundException(
        `User is not a member of team '${team.name}'`,
      );
    }

    await TeamHelper.removeMemberFromTeam(this.prisma, team.id, targetUser.id);

    return {
      success: true,
      message: `User successfully removed from team '${team.name}'`,
    };
  }

  // --- Helpers ---

  private async resolveTargetUser(identifier: string) {
    if (identifier.includes('@')) {
      return UserHelper.findUserByEmail(this.prisma, identifier);
    }
    return UserHelper.findUserByPubId(this.prisma, identifier);
  }

  private toTeamResponseDto(
    team: TeamWithDetails,
    orgPubId: string,
  ): TeamResponseDto {
    return {
      id: team.id,
      pubId: team.pubId,
      name: team.name,
      description: team.description ?? undefined,
      organizationPubId: orgPubId,
      memberCount: team.memberCount,
      members: team.members?.map((m) =>
        this.toTeamMemberResponseDto(m, team.pubId),
      ),
      createdAt: new Date(team.createdAt),
      updatedAt: new Date(team.updatedAt),
    };
  }

  private toTeamMemberResponseDto(
    member: PrismaTeamMemberRecord & { user?: PrismaUserRecord },
    teamPubId: string,
  ): TeamMemberResponseDto {
    return {
      pubId: member.pubId,
      teamPubId,
      user: member.user
        ? {
            pubId: member.user.pubId,
            email: member.user.email,
            firstName: member.user.firstName ?? null,
            lastName: member.user.lastName ?? null,
            fullName:
              [member.user.firstName, member.user.lastName]
                .filter(Boolean)
                .join(' ') || member.user.email,
            createdAt: new Date(member.user.createdAt),
            updatedAt: new Date(member.user.updatedAt),
          }
        : undefined,
      joinedAt: new Date(member.joinedAt),
    };
  }
}
