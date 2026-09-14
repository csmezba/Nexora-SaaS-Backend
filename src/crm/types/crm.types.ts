import type { TicketStatus } from '../enums/ticket-status.enum.js';
import type { TicketPriority } from '../enums/ticket-priority.enum.js';
import type { MessageType } from '../enums/message-type.enum.js';
import type { PrismaUserRecord } from '../../user/types/user.types.js';
import type { PrismaOrganizationRecord } from '../../organization/types/organization.types.js';

export interface PrismaCustomerRecord {
  id: number;
  pubId: string;
  organizationId: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrismaTicketRecord {
  id: number;
  pubId: string;
  customerId: number;
  conversationId: number | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToId: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface PrismaTicketCommentRecord {
  id: number;
  pubId: string;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PrismaConversationRecord {
  id: number;
  pubId: string;
  customerId: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrismaConversationParticipantRecord {
  pubId: string;
  conversationId: number;
  userId: number;
  joinedAt: string;
}

export interface PrismaMessageRecord {
  id: number;
  pubId: string;
  conversationId: number;
  senderId: number | null;
  content: string;
  type: MessageType;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCommentWithAuthor extends PrismaTicketCommentRecord {
  author?: PrismaUserRecord | null;
}

export interface TicketWithDetails extends PrismaTicketRecord {
  customer?: PrismaCustomerRecord | null;
  assignedTo?: PrismaUserRecord | null;
  comments?: TicketCommentWithAuthor[];
}

export interface MessageWithSender extends PrismaMessageRecord {
  sender?: PrismaUserRecord | null;
}

export interface ConversationParticipantWithUser extends PrismaConversationParticipantRecord {
  user?: PrismaUserRecord | null;
}

export interface ConversationWithDetails extends PrismaConversationRecord {
  customer?: PrismaCustomerRecord | null;
  participants?: ConversationParticipantWithUser[];
  messages?: MessageWithSender[];
}

export interface CustomerWithRelations extends PrismaCustomerRecord {
  organization?: PrismaOrganizationRecord | null;
  tickets?: PrismaTicketRecord[];
  conversations?: PrismaConversationRecord[];
}

export interface CreateCustomerData {
  organizationId: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  metadata?: any;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  metadata?: any;
}

export interface CreateTicketData {
  customerId: number;
  conversationId?: number;
  title: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: number;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: number | null;
  resolvedAt?: string | null;
}

export interface CreateTicketCommentData {
  ticketId: number;
  authorId: number;
  content: string;
}

export interface CreateConversationData {
  customerId: number;
  title?: string;
  participantUserIds?: number[];
}

export interface CreateMessageData {
  conversationId: number;
  senderId?: number;
  content: string;
  type?: MessageType;
  metadata?: any;
}
