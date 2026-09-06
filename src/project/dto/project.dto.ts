import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum.js';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';
import { TeamResponseDto } from '../../team/dto/team.dto.js';

@InputType('CreateProjectInput', {
  description: 'Input payload for creating a new project within an organization',
})
export class CreateProjectInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where the project belongs',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, {
    description: 'Project display name (e.g. NextGen Web App, Cloud Migration)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(2, { message: 'Project name must be at least 2 characters' })
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters' })
  name!: string;

  @Field(() => String, {
    description:
      'Unique project key code used for task prefixing (e.g. NEX, PROJ, CLD)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project key is required' })
  @MinLength(2, { message: 'Project key must be at least 2 characters' })
  @MaxLength(10, { message: 'Project key cannot exceed 10 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Project key can only contain alphanumeric characters, underscores, and hyphens',
  })
  key!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed description of project goals and scope',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @Field(() => ProjectStatus, {
    nullable: true,
    defaultValue: ProjectStatus.ACTIVE,
    description: 'Initial project status',
  })
  @IsEnum(ProjectStatus, { message: 'Invalid project status' })
  @IsOptional()
  status?: ProjectStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Optional team pubId to assign this project to',
  })
  @IsString()
  @IsOptional()
  teamPubId?: string;

  @Field(() => Date, {
    nullable: true,
    description: 'Planned project start date',
  })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Target completion due date',
  })
  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @Field(() => [String], {
    nullable: true,
    description: 'List of initial project member user pubIds',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  initialMemberPubIds?: string[];
}

@InputType('UpdateProjectInput', {
  description: 'Input payload for updating an existing project',
})
export class UpdateProjectInput {
  @Field(() => String, {
    nullable: true,
    description: 'Project display name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Project name must be at least 2 characters' })
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Project key code',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Project key must be at least 2 characters' })
  @MaxLength(10, { message: 'Project key cannot exceed 10 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Project key can only contain alphanumeric characters, underscores, and hyphens',
  })
  key?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Project description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @Field(() => ProjectStatus, {
    nullable: true,
    description: 'New project status',
  })
  @IsEnum(ProjectStatus, { message: 'Invalid project status' })
  @IsOptional()
  status?: ProjectStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Assigned team pubId (pass empty string or null to unassign)',
  })
  @IsString()
  @IsOptional()
  teamPubId?: string;

  @Field(() => Date, {
    nullable: true,
    description: 'Project start date',
  })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Project due date',
  })
  @IsDate()
  @IsOptional()
  dueDate?: Date;
}

@InputType('AddProjectMemberInput', {
  description: 'Input payload for adding a user to a project',
})
export class AddProjectMemberInput {
  @Field(() => String, { description: 'Project unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Project pubId is required' })
  projectPubId!: string;

  @Field(() => String, {
    description: 'User identifier (pubId or email) to add to the project',
  })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@InputType('RemoveProjectMemberInput', {
  description: 'Input payload for removing a user from a project',
})
export class RemoveProjectMemberInput {
  @Field(() => String, { description: 'Project unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Project pubId is required' })
  projectPubId!: string;

  @Field(() => String, {
    description: 'User identifier (pubId or email) to remove from the project',
  })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@ObjectType('ProjectMember', { description: 'Project member details' })
export class ProjectMemberResponseDto {
  @Field(() => String, { description: 'Unique public membership identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Project pubId' })
  projectPubId!: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Member user profile',
  })
  user?: UserResponseDto;

  @Field(() => Date, { description: 'Timestamp when member joined the project' })
  joinedAt!: Date;
}

@ObjectType('Project', { description: 'Project details and metadata' })
export class ProjectResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public project identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Project display name' })
  name!: string;

  @Field(() => String, { description: 'Project key code (e.g. NEX, PROJ)' })
  key!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Project description',
  })
  description?: string;

  @Field(() => ProjectStatus, { description: 'Current lifecycle status' })
  status!: ProjectStatus;

  @Field(() => String, {
    description: 'Parent organization public identifier',
  })
  organizationPubId!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Assigned team public identifier',
  })
  teamPubId?: string;

  @Field(() => TeamResponseDto, {
    nullable: true,
    description: 'Assigned team details',
  })
  team?: TeamResponseDto;

  @Field(() => UserResponseDto, {
    description: 'Project creator profile',
  })
  createdBy!: UserResponseDto;

  @Field(() => Int, {
    description: 'Total number of members assigned to this project',
  })
  memberCount!: number;

  @Field(() => [ProjectMemberResponseDto], {
    nullable: true,
    description: 'List of assigned project members',
  })
  members?: ProjectMemberResponseDto[];

  @Field(() => Date, {
    nullable: true,
    description: 'Project start date',
  })
  startDate?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Project due date',
  })
  dueDate?: Date;

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;
}

@ObjectType('DeleteProjectResponse', {
  description: 'Response returned after deleting a project',
})
export class DeleteProjectResponseDto {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

@ObjectType('ProjectActionResponse', {
  description: 'Response returned after performing project member actions',
})
export class ProjectActionResponseDto {
  @Field(() => Boolean, { description: 'Whether the action was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}
