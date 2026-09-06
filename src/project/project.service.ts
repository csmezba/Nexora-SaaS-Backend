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
import * as UserHelper from '../user/user.helper.js';
import * as TeamHelper from '../team/team.helper.js';
import * as ProjectHelper from './project.helper.js';
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  DeleteProjectResponseDto,
  ProjectActionResponseDto,
  ProjectMemberResponseDto,
  ProjectResponseDto,
  RemoveProjectMemberInput,
  UpdateProjectInput,
} from './dto/project.dto.js';
import type {
  PrismaProjectMemberRecord,
  ProjectWithDetails,
} from './types/project.types.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';
import type { UserResponseDto } from '../auth/dto/auth.dto.js';
import type { TeamResponseDto } from '../team/dto/team.dto.js';
import type { PrismaTeamRecord } from '../team/types/team.types.js';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganization(pubIdOrSlug: string) {
    const org = await OrgHelper.findByPubIdOrSlug(this.prisma, pubIdOrSlug);
    if (!org) {
      throw new NotFoundException(`Organization '${pubIdOrSlug}' not found`);
    }
    return org;
  }

  private async ensureOrgMember(organizationId: number, userId: number) {
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

  private async ensureProjectManagerOrAdmin(
    organizationId: number,
    userId: number,
    createdById?: number,
  ) {
    const member = await this.ensureOrgMember(organizationId, userId);
    const isLeadOrAdmin =
      member.role === OrganizationRole.OWNER ||
      member.role === OrganizationRole.ADMIN ||
      member.role === OrganizationRole.MANAGER ||
      member.role === OrganizationRole.DEVELOPER ||
      (createdById !== undefined && createdById === userId);

    if (!isLeadOrAdmin) {
      throw new ForbiddenException(
        'You do not have permission to manage projects in this organization',
      );
    }
    return member;
  }

  // --- Project Operations ---

  async createProject(
    userId: number,
    input: CreateProjectInput,
  ): Promise<ProjectResponseDto> {
    try {
      const org = await this.resolveOrganization(input.organizationPubId);
      await this.ensureProjectManagerOrAdmin(org.id, userId);

      const normalizedKey = input.key.trim().toUpperCase();
      const existingProject = await ProjectHelper.findProjectByKeyAndOrg(
        this.prisma,
        org.id,
        normalizedKey,
      );
      if (existingProject) {
        throw new ConflictException(
          `Project with key '${normalizedKey}' already exists in this organization`,
        );
      }

      let teamId: number | null = null;
      if (input.teamPubId) {
        const team = await TeamHelper.findTeamByPubId(
          this.prisma,
          input.teamPubId,
        );
        if (!team || team.organizationId !== org.id) {
          throw new BadRequestException(
            `Assigned team '${input.teamPubId}' does not belong to this organization`,
          );
        }
        teamId = team.id;
      }

      if (input.startDate && input.dueDate) {
        const start = new Date(input.startDate).getTime();
        const due = new Date(input.dueDate).getTime();
        if (start > due) {
          throw new BadRequestException(
            'Project start date cannot be after the due date',
          );
        }
      }

      const project = await ProjectHelper.createProject(this.prisma, {
        organizationId: org.id,
        teamId,
        createdById: userId,
        name: input.name,
        key: normalizedKey,
        description: input.description,
        status: input.status,
        startDate: input.startDate,
        dueDate: input.dueDate,
      });

      // Automatically add project creator as first member
      await ProjectHelper.addMemberToProject(this.prisma, {
        projectId: project.id,
        userId,
      });

      // Optionally add initial members
      if (input.initialMemberPubIds && input.initialMemberPubIds.length > 0) {
        for (const userPubId of input.initialMemberPubIds) {
          const targetUser = await UserHelper.findUserByPubId(
            this.prisma,
            userPubId,
          );
          if (!targetUser) continue;

          // Verify member belongs to parent organization
          const orgMember = await OrgHelper.findByOrgAndUser(
            this.prisma,
            org.id,
            targetUser.id,
          );
          if (orgMember) {
            await ProjectHelper.addMemberToProject(this.prisma, {
              projectId: project.id,
              userId: targetUser.id,
            });
          }
        }
      }

      const refreshed = await ProjectHelper.findProjectById(
        this.prisma,
        project.id,
      );
      return this.toProjectResponseDto(refreshed ?? project, org.pubId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in createProject: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while creating project',
      );
    }
  }

  async getProject(pubId: string, userId: number): Promise<ProjectResponseDto> {
    try {
      const project = await ProjectHelper.findProjectByPubId(this.prisma, pubId);
      if (!project) {
        throw new NotFoundException(`Project with ID '${pubId}' not found`);
      }

      await this.ensureOrgMember(project.organizationId, userId);
      const org = await OrgHelper.findOrgById(
        this.prisma,
        project.organizationId,
      );

      return this.toProjectResponseDto(project, org?.pubId || '');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in getProject: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching project',
      );
    }
  }

  async listOrganizationProjects(
    organizationPubId: string,
    userId: number,
  ): Promise<ProjectResponseDto[]> {
    try {
      const org = await this.resolveOrganization(organizationPubId);
      await this.ensureOrgMember(org.id, userId);

      const projects = await ProjectHelper.listProjectsByOrg(
        this.prisma,
        org.id,
      );
      return projects.map((p) => this.toProjectResponseDto(p, org.pubId));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listOrganizationProjects: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing organization projects',
      );
    }
  }

  async listTeamProjects(
    teamPubId: string,
    userId: number,
  ): Promise<ProjectResponseDto[]> {
    try {
      const team = await TeamHelper.findTeamByPubId(this.prisma, teamPubId);
      if (!team) {
        throw new NotFoundException(`Team with ID '${teamPubId}' not found`);
      }

      await this.ensureOrgMember(team.organizationId, userId);
      const org = await OrgHelper.findOrgById(
        this.prisma,
        team.organizationId,
      );
      const projects = await ProjectHelper.listProjectsByTeam(
        this.prisma,
        team.id,
      );

      return projects.map((p) => this.toProjectResponseDto(p, org?.pubId || ''));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listTeamProjects: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing team projects',
      );
    }
  }

  async listUserProjects(
    userId: number,
    organizationPubId?: string,
  ): Promise<ProjectResponseDto[]> {
    try {
      let orgId: number | undefined;
      let orgPubId = '';

      if (organizationPubId) {
        const org = await this.resolveOrganization(organizationPubId);
        await this.ensureOrgMember(org.id, userId);
        orgId = org.id;
        orgPubId = org.pubId;
      }

      const projects = await ProjectHelper.listProjectsByUser(
        this.prisma,
        userId,
        orgId,
      );

      const responseList: ProjectResponseDto[] = [];
      for (const project of projects) {
        let resolvedOrgPubId = orgPubId;
        if (!resolvedOrgPubId) {
          const parentOrg = await OrgHelper.findOrgById(
            this.prisma,
            project.organizationId,
          );
          resolvedOrgPubId = parentOrg?.pubId || '';
        }
        responseList.push(
          this.toProjectResponseDto(project, resolvedOrgPubId),
        );
      }

      return responseList;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listUserProjects: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing user projects',
      );
    }
  }

  async updateProject(
    pubId: string,
    userId: number,
    input: UpdateProjectInput,
  ): Promise<ProjectResponseDto> {
    try {
      const project = await ProjectHelper.findProjectByPubId(this.prisma, pubId);
      if (!project) {
        throw new NotFoundException(`Project with ID '${pubId}' not found`);
      }

      await this.ensureProjectManagerOrAdmin(
        project.organizationId,
        userId,
        project.createdById,
      );

      if (
        input.key &&
        input.key.trim().toUpperCase() !== project.key.toUpperCase()
      ) {
        const normalizedKey = input.key.trim().toUpperCase();
        const existing = await ProjectHelper.findProjectByKeyAndOrg(
          this.prisma,
          project.organizationId,
          normalizedKey,
        );
        if (existing && existing.id !== project.id) {
          throw new ConflictException(
            `Project with key '${normalizedKey}' already exists in this organization`,
          );
        }
      }

      let teamId: number | null | undefined = undefined;
      if (input.teamPubId !== undefined) {
        if (input.teamPubId === '' || input.teamPubId === null) {
          teamId = null;
        } else {
          const team = await TeamHelper.findTeamByPubId(
            this.prisma,
            input.teamPubId,
          );
          if (!team || team.organizationId !== project.organizationId) {
            throw new BadRequestException(
              `Assigned team '${input.teamPubId}' does not belong to this organization`,
            );
          }
          teamId = team.id;
        }
      }

      const effectiveStart =
        input.startDate !== undefined ? input.startDate : project.startDate;
      const effectiveDue =
        input.dueDate !== undefined ? input.dueDate : project.dueDate;
      if (effectiveStart && effectiveDue) {
        const start = new Date(effectiveStart).getTime();
        const due = new Date(effectiveDue).getTime();
        if (start > due) {
          throw new BadRequestException(
            'Project start date cannot be after the due date',
          );
        }
      }

      const updated = await ProjectHelper.updateProject(
        this.prisma,
        project.id,
        {
          name: input.name,
          key: input.key,
          description: input.description,
          status: input.status,
          teamId,
          startDate: input.startDate,
          dueDate: input.dueDate,
        },
      );

      if (!updated) {
        throw new NotFoundException(`Failed to update project '${pubId}'`);
      }

      const org = await OrgHelper.findOrgById(
        this.prisma,
        project.organizationId,
      );
      return this.toProjectResponseDto(updated, org?.pubId || '');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in updateProject: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while updating project',
      );
    }
  }

  async deleteProject(
    pubId: string,
    userId: number,
  ): Promise<DeleteProjectResponseDto> {
    try {
      const project = await ProjectHelper.findProjectByPubId(this.prisma, pubId);
      if (!project) {
        throw new NotFoundException(`Project with ID '${pubId}' not found`);
      }

      await this.ensureProjectManagerOrAdmin(
        project.organizationId,
        userId,
        project.createdById,
      );
      await ProjectHelper.deleteProject(this.prisma, project.id);

      return {
        success: true,
        message: `Project '${project.name}' (${project.key}) successfully deleted`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in deleteProject: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting project',
      );
    }
  }

  // --- Project Member Operations ---

  async listProjectMembers(
    projectPubId: string,
    userId: number,
  ): Promise<ProjectMemberResponseDto[]> {
    try {
      const project = await ProjectHelper.findProjectByPubId(
        this.prisma,
        projectPubId,
      );
      if (!project) {
        throw new NotFoundException(
          `Project with ID '${projectPubId}' not found`,
        );
      }

      await this.ensureOrgMember(project.organizationId, userId);
      const members = await ProjectHelper.listProjectMembers(
        this.prisma,
        project.id,
      );

      return members.map((m) =>
        this.toProjectMemberResponseDto(m, project.pubId),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in listProjectMembers: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while listing project members',
      );
    }
  }

  async addProjectMember(
    userId: number,
    input: AddProjectMemberInput,
  ): Promise<ProjectActionResponseDto> {
    try {
      const project = await ProjectHelper.findProjectByPubId(
        this.prisma,
        input.projectPubId,
      );
      if (!project) {
        throw new NotFoundException(
          `Project with ID '${input.projectPubId}' not found`,
        );
      }

      await this.ensureProjectManagerOrAdmin(
        project.organizationId,
        userId,
        project.createdById,
      );

      const targetUser = await this.resolveTargetUser(input.userPubId);
      if (!targetUser) {
        throw new NotFoundException(`User '${input.userPubId}' not found`);
      }

      // Target user must belong to parent organization
      const orgMember = await OrgHelper.findByOrgAndUser(
        this.prisma,
        project.organizationId,
        targetUser.id,
      );
      if (!orgMember) {
        throw new BadRequestException(
          'Target user must be a member of the organization before joining this project',
        );
      }

      await ProjectHelper.addMemberToProject(this.prisma, {
        projectId: project.id,
        userId: targetUser.id,
      });

      return {
        success: true,
        message: `User successfully added to project '${project.name}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in addProjectMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while adding project member',
      );
    }
  }

  async removeProjectMember(
    userId: number,
    input: RemoveProjectMemberInput,
  ): Promise<ProjectActionResponseDto> {
    try {
      const project = await ProjectHelper.findProjectByPubId(
        this.prisma,
        input.projectPubId,
      );
      if (!project) {
        throw new NotFoundException(
          `Project with ID '${input.projectPubId}' not found`,
        );
      }

      const targetUser = await this.resolveTargetUser(input.userPubId);
      if (!targetUser) {
        throw new NotFoundException(`User '${input.userPubId}' not found`);
      }

      // Either user is leaving project themselves, or caller has manager/admin permissions
      if (userId !== targetUser.id) {
        await this.ensureProjectManagerOrAdmin(
          project.organizationId,
          userId,
          project.createdById,
        );
      }

      const membership = await ProjectHelper.findProjectMember(
        this.prisma,
        project.id,
        targetUser.id,
      );
      if (!membership) {
        throw new NotFoundException(
          `User is not assigned to project '${project.name}'`,
        );
      }

      await ProjectHelper.removeMemberFromProject(
        this.prisma,
        project.id,
        targetUser.id,
      );

      return {
        success: true,
        message: `User successfully removed from project '${project.name}'`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error in removeProjectMember: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while removing project member',
      );
    }
  }

  // --- Mappers & Helpers ---

  private async resolveTargetUser(identifier: string) {
    if (identifier.includes('@')) {
      return UserHelper.findUserByEmail(this.prisma, identifier);
    }
    return UserHelper.findUserByPubId(this.prisma, identifier);
  }

  private toProjectResponseDto(
    project: ProjectWithDetails,
    orgPubId: string,
  ): ProjectResponseDto {
    return {
      id: project.id,
      pubId: project.pubId,
      name: project.name,
      key: project.key,
      description: project.description ?? undefined,
      status: project.status,
      organizationPubId: orgPubId,
      teamPubId: project.team ? project.team.pubId : undefined,
      team: project.team
        ? this.toTeamResponseDto(project.team, orgPubId)
        : undefined,
      createdBy: this.toUserResponseDto(project.creator),
      memberCount: project.memberCount,
      members: project.members?.map((m) =>
        this.toProjectMemberResponseDto(m, project.pubId),
      ),
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    };
  }

  private toProjectMemberResponseDto(
    member: PrismaProjectMemberRecord & { user?: PrismaUserRecord },
    projectPubId: string,
  ): ProjectMemberResponseDto {
    return {
      pubId: member.pubId,
      projectPubId,
      user: member.user ? this.toUserResponseDto(member.user) : undefined,
      joinedAt: new Date(member.joinedAt),
    };
  }

  private toTeamResponseDto(
    team: PrismaTeamRecord & { memberCount?: number },
    orgPubId: string,
  ): TeamResponseDto {
    return {
      id: team.id,
      pubId: team.pubId,
      name: team.name,
      description: team.description ?? undefined,
      organizationPubId: orgPubId,
      memberCount: team.memberCount ?? 0,
      createdAt: new Date(team.createdAt),
      updatedAt: new Date(team.updatedAt),
    };
  }

  private toUserResponseDto(user?: PrismaUserRecord): UserResponseDto {
    if (!user) {
      return {
        pubId: '',
        email: '',
        firstName: null,
        lastName: null,
        fullName: 'Unknown User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return {
      pubId: user.pubId,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }
}
