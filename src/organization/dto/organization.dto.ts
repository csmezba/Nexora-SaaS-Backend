import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrganizationRole } from '../enums/organization-role.enum.js';

@InputType('CreateOrganizationInput', {
  description: 'Input payload for creating a new organization',
})
export class CreateOrganizationInput {
  @Field(() => String, {
    nullable: true,
    description: 'Display name of the organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Organization name cannot exceed 100 characters' })
  name?: string;

  @Field(() => String, {
    description: 'Unique URL-friendly slug identifier for the organization',
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(50, { message: 'Slug cannot exceed 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug can only contain lowercase alphanumeric characters and hyphens',
  })
  slug!: string;

  @Field(() => String, { nullable: true, description: 'Organization logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description or bio of the organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}

@InputType('UpdateOrganizationInput', {
  description: 'Input payload for updating an organization',
})
export class UpdateOrganizationInput {
  @Field(() => String, {
    nullable: true,
    description: 'Display name of the organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Organization name cannot exceed 100 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Unique URL-friendly slug identifier for the organization',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(50, { message: 'Slug cannot exceed 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug can only contain lowercase alphanumeric characters and hyphens',
  })
  slug?: string;

  @Field(() => String, { nullable: true, description: 'Organization logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description or bio of the organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}

@ObjectType('Organization', { description: 'Organization details' })
export class OrganizationResponseDto {
  id!: number;

  @Field(() => String, { description: 'Public unique organization identifier' })
  pubId!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization display name',
  })
  name!: string | null;

  @Field(() => String, { description: 'Unique URL slug identifier' })
  slug!: string;

  @Field(() => String, { nullable: true, description: 'Organization logo URL' })
  logoUrl!: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Organization description',
  })
  description!: string | null;

  @Field(() => Date, { description: 'Organization creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Organization last updated timestamp' })
  updatedAt!: Date;

  @Field(() => Int, {
    nullable: true,
    description: 'Total number of organization members',
  })
  memberCount?: number;

  @Field(() => OrganizationRole, {
    nullable: true,
    description: 'Current logged in user role in this organization',
  })
  currentUserRole?: OrganizationRole;
}

@ObjectType('DeleteOrganizationResponse', {
  description: 'Response payload for deleting an organization',
})
export class DeleteOrganizationResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the organization was deleted successfully',
  })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}
