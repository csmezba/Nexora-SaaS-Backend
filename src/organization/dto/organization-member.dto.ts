import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrganizationRole } from '../enums/organization-role.enum.js';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';

@InputType('AddOrganizationMemberInput', {
  description: 'Input payload for adding a member to an organization',
})
export class AddOrganizationMemberInput {
  @Field(() => String, { description: 'Organization identifier (pubId, slug, or ID)' })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationId!: string;

  @Field(() => String, { nullable: true, description: 'User identifier (pubId or ID) to add' })
  @IsString()
  @IsOptional()
  userId?: string;

  @Field(() => String, { nullable: true, description: 'User email to add' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @Field(() => OrganizationRole, {
    nullable: true,
    defaultValue: OrganizationRole.MEMBER,
    description: 'Assigned organization role',
  })
  @IsEnum(OrganizationRole, { message: 'Invalid organization role' })
  @IsOptional()
  role?: OrganizationRole;
}

@InputType('UpdateMemberRoleInput', {
  description: 'Input payload for updating a member role',
})
export class UpdateMemberRoleInput {
  @Field(() => String, { description: 'Organization identifier (pubId, slug, or ID)' })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationId!: string;

  @Field(() => String, { description: 'Target user identifier (pubId, email, or ID)' })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userId!: string;

  @Field(() => OrganizationRole, {
    description: 'New organization role to assign',
  })
  @IsEnum(OrganizationRole, { message: 'Invalid organization role' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: OrganizationRole;
}

@InputType('RemoveMemberInput', {
  description: 'Input payload for removing a member from an organization',
})
export class RemoveMemberInput {
  @Field(() => String, { description: 'Organization identifier (pubId, slug, or ID)' })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationId!: string;

  @Field(() => String, { description: 'Target user identifier (pubId, email, or ID) to remove' })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userId!: string;
}

@ObjectType('OrganizationMember', {
  description: 'Organization membership details',
})
export class OrganizationMemberResponseDto {
  id!: number;

  @Field(() => String, { description: 'Public unique membership identifier' })
  pubId!: string;

  organizationId!: number;

  userId!: number;

  @Field(() => OrganizationRole, {
    description: 'Assigned role in organization',
  })
  role!: OrganizationRole;

  @Field(() => Date, { description: 'Timestamp when member joined' })
  joinedAt!: Date;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'User profile of the member',
  })
  user?: UserResponseDto;
}

@ObjectType('MemberActionResponse', {
  description: 'Response payload for member modification operations',
})
export class MemberActionResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the action was successful',
  })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;

  @Field(() => OrganizationMemberResponseDto, {
    nullable: true,
    description: 'Updated member record',
  })
  member?: OrganizationMemberResponseDto;
}
