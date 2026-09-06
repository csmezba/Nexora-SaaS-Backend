import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PermissionResponseDto } from './permission.dto.js';

@InputType('CreateRoleInput', {
  description: 'Input payload for creating a new organization role',
})
export class CreateRoleInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where the role belongs',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, {
    description: 'Role name (e.g. Project Lead, Support Agent, Billing Manager)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Role description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of permission pubIds to assign to this role initially',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionPubIds?: string[];
}

@InputType('UpdateRoleInput', {
  description: 'Input payload for updating an existing role',
})
export class UpdateRoleInput {
  @Field(() => String, {
    nullable: true,
    description: 'Role display name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Role description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;
}

@InputType('AssignPermissionsInput', {
  description: 'Input payload for assigning or updating permissions of a role',
})
export class AssignPermissionsInput {
  @Field(() => String, { description: 'Role pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Role pubId is required' })
  rolePubId!: string;

  @Field(() => [String], {
    description: 'List of permission pubIds to associate with the role',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one permission must be specified' })
  @IsString({ each: true })
  permissionPubIds!: string[];
}

@InputType('AssignRoleToMemberInput', {
  description: 'Input payload for assigning an organization role to a member',
})
export class AssignRoleToMemberInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where the member belongs',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, { description: 'Organization member pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Organization member pubId is required' })
  memberPubId!: string;

  @Field(() => String, { description: 'Role pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Role pubId is required' })
  rolePubId!: string;
}

@InputType('RemoveRoleFromMemberInput', {
  description: 'Input payload for removing an organization role from a member',
})
export class RemoveRoleFromMemberInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where the member belongs',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, { description: 'Organization member pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Organization member pubId is required' })
  memberPubId!: string;

  @Field(() => String, { description: 'Role pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Role pubId is required' })
  rolePubId!: string;
}

@ObjectType('Role', { description: 'Role details' })
export class RoleResponseDto {
  id!: number;

  @Field(() => String, { description: 'Public unique role identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Role name' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Role description',
  })
  description!: string | null;

  organizationId!: number;

  @Field(() => [PermissionResponseDto], {
    description: 'List of permissions assigned to this role',
  })
  permissions!: PermissionResponseDto[];

  @Field(() => Date, { description: 'Role creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Role last updated timestamp' })
  updatedAt!: Date;
}

@ObjectType('RoleActionResponse', {
  description: 'Generic response payload for role operations',
})
export class RoleActionResponseDto {
  @Field(() => Boolean, { description: 'Whether the operation succeeded' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;

  @Field(() => RoleResponseDto, {
    nullable: true,
    description: 'Role details if applicable',
  })
  role?: RoleResponseDto;
}

@ObjectType('DeleteRoleResponse', {
  description: 'Response payload for deleting a role',
})
export class DeleteRoleResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the role was deleted successfully',
  })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}
