import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ProjectService } from './project.service.js';
import {
  AddProjectMemberInput,
  CreateProjectInput,
  DeleteProjectResponseDto,
  ProjectActionResponseDto,
  ProjectMemberResponseDto,
  ProjectResponseDto,
  RemoveProjectMemberInput,
  UpdateProjectInput,
} from './dto/project.dto.js';

@Resolver(() => ProjectResponseDto)
@UseGuards(JwtAuthGuard)
export class ProjectResolver {
  constructor(private readonly projectService: ProjectService) {}

  // --- Project Queries ---

  @Query(() => [ProjectResponseDto], {
    name: 'organizationProjects',
    description: 'Fetch all projects belonging to an organization',
  })
  async organizationProjects(
    @Args('organizationPubId', {
      type: () => String,
      description: 'Organization pubId or slug',
    })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.listOrganizationProjects(
      organizationPubId,
      userId,
    );
  }

  @Query(() => [ProjectResponseDto], {
    name: 'teamProjects',
    description: 'Fetch all projects assigned to a specific team',
  })
  async teamProjects(
    @Args('teamPubId', {
      type: () => String,
      description: 'Team pubId',
    })
    teamPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.listTeamProjects(teamPubId, userId);
  }

  @Query(() => ProjectResponseDto, {
    name: 'project',
    description: 'Fetch project details by unique pubId',
  })
  async project(
    @Args('pubId', { type: () => String, description: 'Project pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ProjectResponseDto> {
    return this.projectService.getProject(pubId, userId);
  }

  @Query(() => [ProjectResponseDto], {
    name: 'userProjects',
    description:
      'Fetch projects that the authenticated user is assigned to as a member',
  })
  async userProjects(
    @CurrentUser('id') userId: number,
    @Args('organizationPubId', {
      type: () => String,
      nullable: true,
      description: 'Optional organization filter (pubId or slug)',
    })
    organizationPubId?: string,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.listUserProjects(userId, organizationPubId);
  }

  @Query(() => [ProjectMemberResponseDto], {
    name: 'projectMembers',
    description: 'Fetch all members assigned to a project',
  })
  async projectMembers(
    @Args('projectPubId', {
      type: () => String,
      description: 'Project pubId',
    })
    projectPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ProjectMemberResponseDto[]> {
    return this.projectService.listProjectMembers(projectPubId, userId);
  }

  // --- Project Mutations ---

  @Mutation(() => ProjectResponseDto, {
    description:
      'Create a new project within an organization (Requires OWNER, ADMIN, MANAGER, or DEVELOPER role)',
  })
  async createProject(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateProjectInput,
  ): Promise<ProjectResponseDto> {
    return this.projectService.createProject(userId, input);
  }

  @Mutation(() => ProjectResponseDto, {
    description:
      'Update project details (Requires OWNER, ADMIN, MANAGER, or project creator)',
  })
  async updateProject(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Project pubId' })
    pubId: string,
    @Args('input') input: UpdateProjectInput,
  ): Promise<ProjectResponseDto> {
    return this.projectService.updateProject(pubId, userId, input);
  }

  @Mutation(() => DeleteProjectResponseDto, {
    description:
      'Delete a project from an organization (Requires OWNER, ADMIN, or project creator)',
  })
  async deleteProject(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Project pubId' })
    pubId: string,
  ): Promise<DeleteProjectResponseDto> {
    return this.projectService.deleteProject(pubId, userId);
  }

  @Mutation(() => ProjectActionResponseDto, {
    description:
      'Add an organization member to a project (Requires OWNER, ADMIN, MANAGER, or project creator)',
  })
  async addProjectMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddProjectMemberInput,
  ): Promise<ProjectActionResponseDto> {
    return this.projectService.addProjectMember(userId, input);
  }

  @Mutation(() => ProjectActionResponseDto, {
    description:
      'Remove a member from a project (Requires OWNER/ADMIN/MANAGER role or self-removal)',
  })
  async removeProjectMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveProjectMemberInput,
  ): Promise<ProjectActionResponseDto> {
    return this.projectService.removeProjectMember(userId, input);
  }
}
