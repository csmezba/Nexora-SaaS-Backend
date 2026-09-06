import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';

@InputType('CreateTeamInput', {
  description: 'Input payload for creating a new team within an organization',
})
export class CreateTeamInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where the team belongs',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, {
    description: 'Team name (e.g. Frontend Engineering, Product Design, Growth)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Team name is required' })
  @MinLength(2, { message: 'Team name must be at least 2 characters' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Team description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of member user pubIds to add to the team initially',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  initialMemberPubIds?: string[];
}

@InputType('UpdateTeamInput', {
  description: 'Input payload for updating team details',
})
export class UpdateTeamInput {
  @Field(() => String, {
    nullable: true,
    description: 'New team name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Team name must be at least 2 characters' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'New team description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}

@InputType('AddTeamMemberInput', {
  description: 'Input payload for adding a user to a team',
})
export class AddTeamMemberInput {
  @Field(() => String, { description: 'Team public unique identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Team pubId is required' })
  teamPubId!: string;

  @Field(() => String, {
    description: 'User public identifier (pubId) or email to add to the team',
  })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@InputType('RemoveTeamMemberInput', {
  description: 'Input payload for removing a user from a team',
})
export class RemoveTeamMemberInput {
  @Field(() => String, { description: 'Team public unique identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Team pubId is required' })
  teamPubId!: string;

  @Field(() => String, {
    description: 'User public identifier (pubId) or email to remove from the team',
  })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@ObjectType('TeamMember', { description: 'Team membership details' })
export class TeamMemberResponseDto {
  @Field(() => String, { description: 'Unique public membership identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Team pubId' })
  teamPubId!: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Member user profile',
  })
  user?: UserResponseDto;

  @Field(() => Date, { description: 'Timestamp when member joined the team' })
  joinedAt!: Date;
}

@ObjectType('Team', { description: 'Team details' })
export class TeamResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public team identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Team name' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Team description',
  })
  description?: string;

  @Field(() => String, {
    description: 'Parent organization public identifier',
  })
  organizationPubId!: string;

  @Field(() => Int, {
    description: 'Total number of members in this team',
  })
  memberCount!: number;

  @Field(() => [TeamMemberResponseDto], {
    nullable: true,
    description: 'List of team members',
  })
  members?: TeamMemberResponseDto[];

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;
}

@ObjectType('DeleteTeamResponse', {
  description: 'Response returned after deleting a team',
})
export class DeleteTeamResponseDto {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

@ObjectType('TeamActionResponse', {
  description: 'Response returned after performing team actions (e.g. member add/remove)',
})
export class TeamActionResponseDto {
  @Field(() => Boolean, { description: 'Whether the action was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}
