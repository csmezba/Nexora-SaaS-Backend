import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TicketStatus } from '../enums/ticket-status.enum.js';
import { TicketPriority } from '../enums/ticket-priority.enum.js';
import { MessageType } from '../enums/message-type.enum.js';
import { UserResponseDto } from '../../auth/dto/auth.dto.js';

// ==========================================
// CUSTOMER DTOs
// ==========================================

@InputType()
export class CreateCustomerInput {
  @Field(() => String, { description: 'Target organization public ID' })
  @IsNotEmpty()
  @IsString()
  organizationPubId!: string;

  @Field(() => String, { description: 'Customer full name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @Field(() => String, { nullable: true, description: 'Customer email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true, description: 'Customer contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true, description: 'Customer company name' })
  @IsOptional()
  @IsString()
  company?: string;
}

@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  company?: string;
}

@InputType()
export class CustomerFilterInput {
  @Field(() => String, { nullable: true, description: 'Search by name, email, or company' })
  @IsOptional()
  @IsString()
  search?: string;
}

@ObjectType()
export class CustomerResponseDto {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  pubId!: string;

  @Field(() => String)
  organizationPubId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  company?: string;

  @Field(() => Int, { nullable: true })
  ticketCount?: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class DeleteCustomerResponseDto {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

// ==========================================
// TICKET DTOs
// ==========================================

@InputType()
export class CreateTicketInput {
  @Field(() => String, { description: 'Customer pubId owning this ticket' })
  @IsNotEmpty()
  @IsString()
  customerPubId!: string;

  @Field(() => String, { description: 'Ticket title / subject' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true, description: 'Detailed issue description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => TicketStatus, { nullable: true, defaultValue: TicketStatus.OPEN })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @Field(() => TicketPriority, { nullable: true, defaultValue: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @Field(() => String, { nullable: true, description: 'Assigned agent User pubId' })
  @IsOptional()
  @IsString()
  assignedToUserPubId?: string;

  @Field(() => String, { nullable: true, description: 'Optional conversation pubId' })
  @IsOptional()
  @IsString()
  conversationPubId?: string;
}

@InputType()
export class UpdateTicketInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => TicketStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @Field(() => TicketPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assignedToUserPubId?: string;
}

@InputType()
export class AssignTicketInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  ticketPubId!: string;

  @Field(() => String, { nullable: true, description: 'User pubId to assign (or null to unassign)' })
  @IsOptional()
  @IsString()
  assignedToUserPubId?: string;
}

@InputType()
export class TicketFilterInput {
  @Field(() => TicketStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @Field(() => TicketPriority, { nullable: true })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assignedToUserPubId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  customerPubId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

@ObjectType()
export class TicketCommentResponseDto {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  pubId!: string;

  @Field(() => String)
  ticketPubId!: string;

  @Field(() => UserResponseDto, { nullable: true })
  author?: UserResponseDto;

  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class TicketResponseDto {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  pubId!: string;

  @Field(() => String)
  customerPubId!: string;

  @Field(() => CustomerResponseDto, { nullable: true })
  customer?: CustomerResponseDto;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => TicketStatus)
  status!: TicketStatus;

  @Field(() => TicketPriority)
  priority!: TicketPriority;

  @Field(() => UserResponseDto, { nullable: true })
  assignedTo?: UserResponseDto;

  @Field(() => [TicketCommentResponseDto], { nullable: true })
  comments?: TicketCommentResponseDto[];

  @Field(() => Int, { nullable: true })
  commentsCount?: number;

  @Field(() => Date, { nullable: true })
  resolvedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class DeleteTicketResponseDto {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

// ==========================================
// TICKET COMMENT DTOs
// ==========================================

@InputType()
export class CreateTicketCommentInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  ticketPubId!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  content!: string;
}

@InputType()
export class UpdateTicketCommentInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  commentPubId!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  content!: string;
}

@ObjectType()
export class DeleteTicketCommentResponseDto {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

// ==========================================
// CONVERSATION & MESSAGE DTOs
// ==========================================

@InputType()
export class CreateConversationInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  customerPubId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => [String], { nullable: true, description: 'Initial agent participant user pubIds' })
  @IsOptional()
  participantUserPubIds?: string[];
}

@InputType()
export class SendMessageInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  conversationPubId!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  content!: string;

  @Field(() => MessageType, { nullable: true, defaultValue: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}

@ObjectType()
export class MessageResponseDto {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  pubId!: string;

  @Field(() => String)
  conversationPubId!: string;

  @Field(() => UserResponseDto, { nullable: true })
  sender?: UserResponseDto;

  @Field(() => String)
  content!: string;

  @Field(() => MessageType)
  type!: MessageType;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class ConversationResponseDto {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  pubId!: string;

  @Field(() => String)
  customerPubId!: string;

  @Field(() => CustomerResponseDto, { nullable: true })
  customer?: CustomerResponseDto;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => [UserResponseDto], { nullable: true })
  participants?: UserResponseDto[];

  @Field(() => [MessageResponseDto], { nullable: true })
  messages?: MessageResponseDto[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
