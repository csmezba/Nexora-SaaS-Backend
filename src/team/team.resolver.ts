import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { TeamService } from './team.service.js';
import {
  AddTeamMemberInput,
  CreateTeamInput,
  DeleteTeamResponseDto,
  RemoveTeamMemberInput,
  TeamActionResponseDto,
  TeamMemberResponseDto,
  TeamResponseDto,
  UpdateTeamInput,
} from './dto/team.dto.js';

@Resolver(() => TeamResponseDto)
@UseGuards(JwtAuthGuard)
export class TeamResolver {
  constructor(private readonly teamService: TeamService) {}

  // --- Team Queries ---

  @Query(() => [TeamResponseDto], {
    name: 'organizationTeams',
    description: 'Fetch all teams belonging to an organization',
  })
  async organizationTeams(
    @Args('organizationPubId', {
      type: () => String,
      description: 'Organization pubId or slug',
    })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TeamResponseDto[]> {
    return this.teamService.listOrganizationTeams(organizationPubId, userId);
  }

  @Query(() => TeamResponseDto, {
    name: 'team',
    description: 'Fetch team details by unique team pubId',
  })
  async team(
    @Args('pubId', { type: () => String, description: 'Team pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TeamResponseDto> {
    return this.teamService.getTeam(pubId, userId);
  }

  @Query(() => [TeamResponseDto], {
    name: 'userTeams',
    description: 'Fetch teams that the authenticated user is a member of',
  })
  async userTeams(
    @CurrentUser('id') userId: number,
    @Args('organizationPubId', {
      type: () => String,
      nullable: true,
      description: 'Optional organization filter (pubId or slug)',
    })
    organizationPubId?: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamService.listUserTeams(userId, organizationPubId);
  }

  @Query(() => [TeamMemberResponseDto], {
    name: 'teamMembers',
    description: 'Fetch all members belonging to a team',
  })
  async teamMembers(
    @Args('teamPubId', { type: () => String, description: 'Team pubId' })
    teamPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamService.listTeamMembers(teamPubId, userId);
  }

  // --- Team Mutations ---

  @Mutation(() => TeamResponseDto, {
    description:
      'Create a new team within an organization (Requires OWNER, ADMIN, or MANAGER role)',
  })
  async createTeam(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateTeamInput,
  ): Promise<TeamResponseDto> {
    return this.teamService.createTeam(userId, input);
  }

  @Mutation(() => TeamResponseDto, {
    description:
      'Update team details (Requires OWNER, ADMIN, or MANAGER role)',
  })
  async updateTeam(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Team pubId' })
    pubId: string,
    @Args('input') input: UpdateTeamInput,
  ): Promise<TeamResponseDto> {
    return this.teamService.updateTeam(pubId, userId, input);
  }

  @Mutation(() => DeleteTeamResponseDto, {
    description:
      'Delete a team from an organization (Requires OWNER, ADMIN, or MANAGER role)',
  })
  async deleteTeam(
    @CurrentUser('id') userId: number,
    @Args('pubId', { type: () => String, description: 'Team pubId' })
    pubId: string,
  ): Promise<DeleteTeamResponseDto> {
    return this.teamService.deleteTeam(pubId, userId);
  }

  @Mutation(() => TeamActionResponseDto, {
    description:
      'Add a user to a team (Requires OWNER, ADMIN, or MANAGER role)',
  })
  async addTeamMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: AddTeamMemberInput,
  ): Promise<TeamActionResponseDto> {
    return this.teamService.addTeamMember(userId, input);
  }

  @Mutation(() => TeamActionResponseDto, {
    description:
      'Remove a user from a team (Requires OWNER/ADMIN role or self-removal)',
  })
  async removeTeamMember(
    @CurrentUser('id') userId: number,
    @Args('input') input: RemoveTeamMemberInput,
  ): Promise<TeamActionResponseDto> {
    return this.teamService.removeTeamMember(userId, input);
  }
}
