import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum.js';
import { TaskPriority } from '../enums/task-priority.enum.js';
import { DependencyType } from '../enums/dependency-type.enum.js';
import { SprintStatus } from '../enums/sprint-status.enum.js';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';
import { ProjectResponseDto } from '../../project/dto/project.dto.js';

// ==========================================
// OBJECT TYPES (OUTPUT DTOs)
// ==========================================

@ObjectType('Label', { description: 'Organization-level task label/tag' })
export class LabelResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public label identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Parent organization public identifier' })
  organizationPubId!: string;

  @Field(() => String, { description: 'Label display name' })
  name!: string;

  @Field(() => String, { description: 'Hex color code (e.g. #FF5733)' })
  color!: string;
}

@ObjectType('TaskAssignee', { description: 'Task assignee user relationship' })
export class TaskAssigneeResponseDto {
  @Field(() => String, { description: 'Unique public assignee record identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Task public identifier' })
  taskPubId!: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Assigned user details',
  })
  user?: UserResponseDto;

  @Field(() => Date, { description: 'Timestamp when user was assigned' })
  assignedAt!: Date;
}

@ObjectType('TaskComment', { description: 'Task comment item' })
export class TaskCommentResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public comment identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Task public identifier' })
  taskPubId!: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Author user details',
  })
  author?: UserResponseDto;

  @Field(() => String, { description: 'Comment markdown/text content' })
  content!: string;

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;
}

@ObjectType('TaskDependency', { description: 'Task dependency/blocker relationship' })
export class TaskDependencyResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public dependency identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Source task public identifier' })
  taskPubId!: string;

  @Field(() => String, { description: 'Target dependent task public identifier' })
  dependsOnTaskPubId!: string;

  @Field(() => DependencyType, { description: 'Dependency relationship type' })
  type!: DependencyType;

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;
}

@ObjectType('Task', { description: 'Task issue item details' })
export class TaskResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public task identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Parent project public identifier' })
  projectPubId!: string;

  @Field(() => ProjectResponseDto, {
    nullable: true,
    description: 'Parent project details',
  })
  project?: ProjectResponseDto;

  @Field(() => String, { description: 'Task summary title' })
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed description or markdown content',
  })
  description?: string;

  @Field(() => TaskStatus, { description: 'Current task lifecycle status' })
  status!: TaskStatus;

  @Field(() => TaskPriority, { description: 'Task priority level' })
  priority!: TaskPriority;

  @Field(() => Float, { description: 'Kanban/board position order' })
  position!: number;

  @Field(() => Date, {
    nullable: true,
    description: 'Task due date and time',
  })
  dueDate?: Date;

  @Field(() => String, {
    nullable: true,
    description: 'Parent task public identifier if this is a subtask',
  })
  parentTaskPubId?: string;

  @Field(() => UserResponseDto, {
    nullable: true,
    description: 'Task creator user details',
  })
  creator?: UserResponseDto;

  @Field(() => [TaskAssigneeResponseDto], {
    nullable: true,
    description: 'Users assigned to this task',
  })
  assignees?: TaskAssigneeResponseDto[];

  @Field(() => [LabelResponseDto], {
    nullable: true,
    description: 'Labels attached to this task',
  })
  labels?: LabelResponseDto[];

  @Field(() => [TaskCommentResponseDto], {
    nullable: true,
    description: 'Comments posted on this task',
  })
  comments?: TaskCommentResponseDto[];

  @Field(() => [TaskDependencyResponseDto], {
    nullable: true,
    description: 'Tasks that this task depends on',
  })
  dependencies?: TaskDependencyResponseDto[];

  @Field(() => [TaskDependencyResponseDto], {
    nullable: true,
    description: 'Tasks blocked by this task',
  })
  blockedBy?: TaskDependencyResponseDto[];

  @Field(() => [TaskResponseDto], {
    nullable: true,
    description: 'Subtasks under this task',
  })
  subTasks?: TaskResponseDto[];

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;
}

@ObjectType('Sprint', { description: 'Project sprint / milestone iteration' })
export class SprintResponseDto {
  id!: number;

  @Field(() => String, { description: 'Unique public sprint identifier' })
  pubId!: string;

  @Field(() => String, { description: 'Parent project public identifier' })
  projectPubId!: string;

  @Field(() => ProjectResponseDto, {
    nullable: true,
    description: 'Parent project details',
  })
  project?: ProjectResponseDto;

  @Field(() => String, { description: 'Sprint name (e.g. Sprint 1 - Core Features)' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Sprint goal or milestone objective',
  })
  goal?: string;

  @Field(() => SprintStatus, { description: 'Sprint lifecycle status' })
  status!: SprintStatus;

  @Field(() => Date, { description: 'Sprint start date' })
  startDate!: Date;

  @Field(() => Date, { description: 'Sprint end date' })
  endDate!: Date;

  @Field(() => Int, { description: 'Total tasks in this sprint' })
  taskCount!: number;

  @Field(() => [TaskResponseDto], {
    nullable: true,
    description: 'Tasks included in this sprint',
  })
  tasks?: TaskResponseDto[];

  @Field(() => Date, { description: 'Creation timestamp' })
  createdAt!: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt!: Date;
}

@ObjectType('TaskActionResponse', {
  description: 'Response returned after performing task actions',
})
export class TaskActionResponseDto {
  @Field(() => Boolean, { description: 'Whether the action was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

@ObjectType('DeleteTaskResponse', {
  description: 'Response returned after deleting a task',
})
export class DeleteTaskResponseDto {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

@ObjectType('DeleteSprintResponse', {
  description: 'Response returned after deleting a sprint',
})
export class DeleteSprintResponseDto {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

@ObjectType('DeleteLabelResponse', {
  description: 'Response returned after deleting a label',
})
export class DeleteLabelResponseDto {
  @Field(() => Boolean, { description: 'Whether deletion was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Status message' })
  message!: string;
}

// ==========================================
// INPUT TYPES (MUTATION PAYLOADS)
// ==========================================

@InputType('CreateTaskInput', {
  description: 'Input payload for creating a new task',
})
export class CreateTaskInput {
  @Field(() => String, { description: 'Project pubId where task is created' })
  @IsString()
  @IsNotEmpty({ message: 'Project identifier is required' })
  projectPubId!: string;

  @Field(() => String, { description: 'Task title summary' })
  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  @MinLength(2, { message: 'Task title must be at least 2 characters' })
  @MaxLength(200, { message: 'Task title cannot exceed 200 characters' })
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed description or markdown',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description?: string;

  @Field(() => TaskStatus, {
    nullable: true,
    defaultValue: TaskStatus.TODO,
    description: 'Initial task status',
  })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsOptional()
  status?: TaskStatus;

  @Field(() => TaskPriority, {
    nullable: true,
    defaultValue: TaskPriority.MEDIUM,
    description: 'Task priority level',
  })
  @IsEnum(TaskPriority, { message: 'Invalid task priority' })
  @IsOptional()
  priority?: TaskPriority;

  @Field(() => Float, {
    nullable: true,
    defaultValue: 0,
    description: 'Position order on board',
  })
  @IsNumber()
  @IsOptional()
  position?: number;

  @Field(() => Date, {
    nullable: true,
    description: 'Target due date',
  })
  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @Field(() => String, {
    nullable: true,
    description: 'Parent task pubId if creating a subtask',
  })
  @IsString()
  @IsOptional()
  parentTaskPubId?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'User pubIds to assign to this task upon creation',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeUserPubIds?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Label pubIds to attach to this task upon creation',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labelPubIds?: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Optional sprint pubId to add this task to',
  })
  @IsString()
  @IsOptional()
  sprintPubId?: string;
}

@InputType('UpdateTaskInput', {
  description: 'Input payload for updating an existing task',
})
export class UpdateTaskInput {
  @Field(() => String, {
    nullable: true,
    description: 'Updated task title',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Task title must be at least 2 characters' })
  @MaxLength(200, { message: 'Task title cannot exceed 200 characters' })
  title?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated task description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description?: string;

  @Field(() => TaskStatus, {
    nullable: true,
    description: 'Updated task lifecycle status',
  })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsOptional()
  status?: TaskStatus;

  @Field(() => TaskPriority, {
    nullable: true,
    description: 'Updated task priority level',
  })
  @IsEnum(TaskPriority, { message: 'Invalid task priority' })
  @IsOptional()
  priority?: TaskPriority;

  @Field(() => Float, {
    nullable: true,
    description: 'Updated position order on board',
  })
  @IsNumber()
  @IsOptional()
  position?: number;

  @Field(() => Date, {
    nullable: true,
    description: 'Updated due date',
  })
  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @Field(() => String, {
    nullable: true,
    description: 'Updated parent task pubId (empty string to detach parent)',
  })
  @IsString()
  @IsOptional()
  parentTaskPubId?: string;
}

@InputType('UpdateTaskPositionInput', {
  description: 'Input payload for moving/reordering a task on a Kanban board',
})
export class UpdateTaskPositionInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => Float, { description: 'New position value' })
  @IsNumber()
  position!: number;

  @Field(() => TaskStatus, {
    nullable: true,
    description: 'Optional updated status column',
  })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsOptional()
  status?: TaskStatus;
}

@InputType('AssignTaskInput', {
  description: 'Input payload for assigning a user to a task',
})
export class AssignTaskInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'User identifier (pubId or email)' })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@InputType('UnassignTaskInput', {
  description: 'Input payload for unassigning a user from a task',
})
export class UnassignTaskInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'User identifier (pubId or email)' })
  @IsString()
  @IsNotEmpty({ message: 'User identifier is required' })
  userPubId!: string;
}

@InputType('CreateLabelInput', {
  description: 'Input payload for creating an organization label',
})
export class CreateLabelInput {
  @Field(() => String, {
    description: 'Organization pubId or slug where label is created',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization identifier is required' })
  organizationPubId!: string;

  @Field(() => String, { description: 'Label name (e.g. Bug, Feature, DevOps)' })
  @IsString()
  @IsNotEmpty({ message: 'Label name is required' })
  @MinLength(1, { message: 'Label name must be at least 1 character' })
  @MaxLength(50, { message: 'Label name cannot exceed 50 characters' })
  name!: string;

  @Field(() => String, { description: 'Hex color code (e.g. #3B82F6)' })
  @IsString()
  @IsNotEmpty({ message: 'Color code is required' })
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'Color must be a valid hex code (e.g. #FF5733 or #FFF)',
  })
  color!: string;
}

@InputType('UpdateLabelInput', {
  description: 'Input payload for updating a label',
})
export class UpdateLabelInput {
  @Field(() => String, {
    nullable: true,
    description: 'Updated label name',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Label name must be at least 1 character' })
  @MaxLength(50, { message: 'Label name cannot exceed 50 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated hex color code',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'Color must be a valid hex code (e.g. #FF5733 or #FFF)',
  })
  color?: string;
}

@InputType('AddLabelToTaskInput', {
  description: 'Input payload for attaching a label to a task',
})
export class AddLabelToTaskInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'Label unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Label pubId is required' })
  labelPubId!: string;
}

@InputType('RemoveLabelFromTaskInput', {
  description: 'Input payload for detaching a label from a task',
})
export class RemoveLabelFromTaskInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'Label unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Label pubId is required' })
  labelPubId!: string;
}

@InputType('CreateTaskCommentInput', {
  description: 'Input payload for adding a comment to a task',
})
export class CreateTaskCommentInput {
  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'Comment markdown/text content' })
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(5000, { message: 'Comment cannot exceed 5000 characters' })
  content!: string;
}

@InputType('UpdateTaskCommentInput', {
  description: 'Input payload for updating a task comment',
})
export class UpdateTaskCommentInput {
  @Field(() => String, { description: 'Updated markdown/text content' })
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(5000, { message: 'Comment cannot exceed 5000 characters' })
  content!: string;
}

@InputType('AddTaskDependencyInput', {
  description: 'Input payload for creating a task dependency relationship',
})
export class AddTaskDependencyInput {
  @Field(() => String, { description: 'Source task pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Source task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'Target dependent task pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Dependent task pubId is required' })
  dependsOnTaskPubId!: string;

  @Field(() => DependencyType, {
    nullable: true,
    defaultValue: DependencyType.BLOCKS,
    description: 'Dependency relation type',
  })
  @IsEnum(DependencyType, { message: 'Invalid dependency type' })
  @IsOptional()
  type?: DependencyType;
}

@InputType('RemoveTaskDependencyInput', {
  description: 'Input payload for removing a task dependency relationship',
})
export class RemoveTaskDependencyInput {
  @Field(() => String, { description: 'Source task pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Source task pubId is required' })
  taskPubId!: string;

  @Field(() => String, { description: 'Target dependent task pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Dependent task pubId is required' })
  dependsOnTaskPubId!: string;
}

@InputType('CreateSprintInput', {
  description: 'Input payload for creating a project sprint',
})
export class CreateSprintInput {
  @Field(() => String, { description: 'Project pubId where sprint belongs' })
  @IsString()
  @IsNotEmpty({ message: 'Project identifier is required' })
  projectPubId!: string;

  @Field(() => String, { description: 'Sprint name (e.g. Sprint 1 - Alpha MVP)' })
  @IsString()
  @IsNotEmpty({ message: 'Sprint name is required' })
  @MinLength(2, { message: 'Sprint name must be at least 2 characters' })
  @MaxLength(100, { message: 'Sprint name cannot exceed 100 characters' })
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Sprint objective / milestone goal',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Goal cannot exceed 1000 characters' })
  goal?: string;

  @Field(() => SprintStatus, {
    nullable: true,
    defaultValue: SprintStatus.PLANNED,
    description: 'Initial sprint status',
  })
  @IsEnum(SprintStatus, { message: 'Invalid sprint status' })
  @IsOptional()
  status?: SprintStatus;

  @Field(() => Date, { description: 'Sprint planned start date' })
  @IsDate()
  startDate!: Date;

  @Field(() => Date, { description: 'Sprint planned end date' })
  @IsDate()
  endDate!: Date;
}

@InputType('UpdateSprintInput', {
  description: 'Input payload for updating a sprint',
})
export class UpdateSprintInput {
  @Field(() => String, {
    nullable: true,
    description: 'Updated sprint name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Sprint name must be at least 2 characters' })
  @MaxLength(100, { message: 'Sprint name cannot exceed 100 characters' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated sprint goal',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Goal cannot exceed 1000 characters' })
  goal?: string;

  @Field(() => SprintStatus, {
    nullable: true,
    description: 'Updated sprint status',
  })
  @IsEnum(SprintStatus, { message: 'Invalid sprint status' })
  @IsOptional()
  status?: SprintStatus;

  @Field(() => Date, {
    nullable: true,
    description: 'Updated sprint start date',
  })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Updated sprint end date',
  })
  @IsDate()
  @IsOptional()
  endDate?: Date;
}

@InputType('AddSprintTaskInput', {
  description: 'Input payload for adding a task to a sprint',
})
export class AddSprintTaskInput {
  @Field(() => String, { description: 'Sprint unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Sprint pubId is required' })
  sprintPubId!: string;

  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;
}

@InputType('RemoveSprintTaskInput', {
  description: 'Input payload for removing a task from a sprint',
})
export class RemoveSprintTaskInput {
  @Field(() => String, { description: 'Sprint unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Sprint pubId is required' })
  sprintPubId!: string;

  @Field(() => String, { description: 'Task unique pubId' })
  @IsString()
  @IsNotEmpty({ message: 'Task pubId is required' })
  taskPubId!: string;
}
