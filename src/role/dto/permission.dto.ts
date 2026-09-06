import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType('CreatePermissionInput', {
  description: 'Input payload for creating a new system permission',
})
export class CreatePermissionInput {
  @Field(() => String, {
    description: 'Target resource name (e.g. project, task, billing)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Resource is required' })
  @MinLength(2, { message: 'Resource must be at least 2 characters' })
  @MaxLength(50, { message: 'Resource cannot exceed 50 characters' })
  resource!: string;

  @Field(() => String, {
    description: 'Action performed on the resource (e.g. create, read, update, delete, manage)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Action is required' })
  @MinLength(2, { message: 'Action must be at least 2 characters' })
  @MaxLength(50, { message: 'Action cannot exceed 50 characters' })
  action!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description of what this permission allows',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;
}

@InputType('UpdatePermissionInput', {
  description: 'Input payload for updating an existing permission',
})
export class UpdatePermissionInput {
  @Field(() => String, {
    nullable: true,
    description: 'Target resource name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Resource must be at least 2 characters' })
  @MaxLength(50, { message: 'Resource cannot exceed 50 characters' })
  resource?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Action performed on the resource',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Action must be at least 2 characters' })
  @MaxLength(50, { message: 'Action cannot exceed 50 characters' })
  action?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description of what this permission allows',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;
}

@ObjectType('Permission', { description: 'Permission details' })
export class PermissionResponseDto {
  id!: number;

  @Field(() => String, { description: 'Public unique permission identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Target resource name' })
  resource!: string;

  @Field(() => String, { description: 'Action on the resource' })
  action!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Permission description',
  })
  description!: string | null;

  @Field(() => Date, { description: 'Permission creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Permission last updated timestamp' })
  updatedAt!: Date;
}

@ObjectType('DeletePermissionResponse', {
  description: 'Response payload for deleting a permission',
})
export class DeletePermissionResponseDto {
  @Field(() => Boolean, {
    description: 'Indicates whether the permission was deleted successfully',
  })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}
