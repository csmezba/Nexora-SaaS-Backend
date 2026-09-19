import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CrmService } from './crm.service.js';
import {
  AssignTicketInput,
  ConversationResponseDto,
  CreateConversationInput,
  CreateCustomerInput,
  CreateTicketCommentInput,
  CreateTicketInput,
  CustomerFilterInput,
  CustomerResponseDto,
  DeleteCustomerResponseDto,
  DeleteTicketCommentResponseDto,
  DeleteTicketResponseDto,
  MessageResponseDto,
  PublicInquiryInput,
  PublicInquiryResponseDto,
  SendMessageInput,
  TicketCommentResponseDto,
  TicketFilterInput,
  TicketResponseDto,
  UpdateCustomerInput,
  UpdateTicketCommentInput,
  UpdateTicketInput,
} from './dto/crm.dto.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CrmResolver {
  constructor(private readonly crmService: CrmService) {}

  // ==========================================
  // CUSTOMER QUERIES & MUTATIONS
  // ==========================================

  @Query(() => CustomerResponseDto, {
    name: 'customer',
    description: 'Get customer details by pubId',
  })
  async customer(
    @Args('pubId', { type: () => String, description: 'Customer pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<CustomerResponseDto> {
    return this.crmService.getCustomer(pubId, userId);
  }

  @Query(() => [CustomerResponseDto], {
    name: 'customers',
    description: 'List customers in an organization',
  })
  async customers(
    @Args('organizationPubId', { type: () => String })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
    @Args('filter', { type: () => CustomerFilterInput, nullable: true })
    filter?: CustomerFilterInput,
  ): Promise<CustomerResponseDto[]> {
    return this.crmService.listCustomers(organizationPubId, userId, filter);
  }

  @Mutation(() => CustomerResponseDto, {
    name: 'createCustomer',
    description: 'Create a new customer profile in an organization',
  })
  async createCustomer(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateCustomerInput,
  ): Promise<CustomerResponseDto> {
    return this.crmService.createCustomer(userId, input);
  }

  @Mutation(() => CustomerResponseDto, {
    name: 'updateCustomer',
    description: 'Update customer contact information',
  })
  async updateCustomer(
    @Args('pubId', { type: () => String }) pubId: string,
    @CurrentUser('id') userId: number,
    @Args('input') input: UpdateCustomerInput,
  ): Promise<CustomerResponseDto> {
    return this.crmService.updateCustomer(pubId, userId, input);
  }

  @Mutation(() => DeleteCustomerResponseDto, {
    name: 'deleteCustomer',
    description: 'Delete a customer profile',
  })
  async deleteCustomer(
    @Args('pubId', { type: () => String }) pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<DeleteCustomerResponseDto> {
    return this.crmService.deleteCustomer(pubId, userId);
  }

  // ==========================================
  // TICKET QUERIES & MUTATIONS
  // ==========================================

  @Query(() => TicketResponseDto, {
    name: 'ticket',
    description: 'Get ticket details with comments and assignee',
  })
  async ticket(
    @Args('pubId', { type: () => String, description: 'Ticket pubId' })
    pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TicketResponseDto> {
    return this.crmService.getTicket(pubId, userId);
  }

  @Query(() => [TicketResponseDto], {
    name: 'tickets',
    description: 'List support tickets in an organization with filters',
  })
  async tickets(
    @Args('organizationPubId', { type: () => String })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
    @Args('filter', { type: () => TicketFilterInput, nullable: true })
    filter?: TicketFilterInput,
  ): Promise<TicketResponseDto[]> {
    return this.crmService.listTickets(organizationPubId, userId, filter);
  }

  @Mutation(() => TicketResponseDto, {
    name: 'createTicket',
    description: 'Create a support ticket for a customer',
  })
  async createTicket(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateTicketInput,
  ): Promise<TicketResponseDto> {
    return this.crmService.createTicket(userId, input);
  }

  @Mutation(() => TicketResponseDto, {
    name: 'updateTicket',
    description: 'Update ticket title, status, priority, or assignment',
  })
  async updateTicket(
    @Args('pubId', { type: () => String }) pubId: string,
    @CurrentUser('id') userId: number,
    @Args('input') input: UpdateTicketInput,
  ): Promise<TicketResponseDto> {
    return this.crmService.updateTicket(pubId, userId, input);
  }

  @Mutation(() => TicketResponseDto, {
    name: 'assignTicket',
    description: 'Assign a ticket to a support agent',
  })
  async assignTicket(
    @CurrentUser('id') userId: number,
    @Args('input') input: AssignTicketInput,
  ): Promise<TicketResponseDto> {
    return this.crmService.assignTicket(userId, input);
  }

  @Mutation(() => DeleteTicketResponseDto, {
    name: 'deleteTicket',
    description: 'Delete a support ticket',
  })
  async deleteTicket(
    @Args('pubId', { type: () => String }) pubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<DeleteTicketResponseDto> {
    return this.crmService.deleteTicket(pubId, userId);
  }

  // ==========================================
  // TICKET COMMENT QUERIES & MUTATIONS
  // ==========================================

  @Query(() => [TicketCommentResponseDto], {
    name: 'ticketComments',
    description: 'List all comments on a support ticket',
  })
  async ticketComments(
    @Args('ticketPubId', { type: () => String }) ticketPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<TicketCommentResponseDto[]> {
    return this.crmService.listTicketComments(ticketPubId, userId);
  }

  @Mutation(() => TicketCommentResponseDto, {
    name: 'createTicketComment',
    description: 'Add an internal comment to a support ticket',
  })
  async createTicketComment(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateTicketCommentInput,
  ): Promise<TicketCommentResponseDto> {
    return this.crmService.createTicketComment(userId, input);
  }

  @Mutation(() => TicketCommentResponseDto, {
    name: 'updateTicketComment',
    description: 'Edit your ticket comment',
  })
  async updateTicketComment(
    @Args('commentPubId', { type: () => String }) commentPubId: string,
    @CurrentUser('id') userId: number,
    @Args('input') input: UpdateTicketCommentInput,
  ): Promise<TicketCommentResponseDto> {
    return this.crmService.updateTicketComment(commentPubId, userId, input);
  }

  @Mutation(() => DeleteTicketCommentResponseDto, {
    name: 'deleteTicketComment',
    description: 'Delete a comment from a support ticket',
  })
  async deleteTicketComment(
    @Args('commentPubId', { type: () => String }) commentPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<DeleteTicketCommentResponseDto> {
    return this.crmService.deleteTicketComment(commentPubId, userId);
  }

  // ==========================================
  // CONVERSATION & MESSAGE QUERIES & MUTATIONS
  // ==========================================

  @Public()
  @Query(() => ConversationResponseDto, {
    name: 'conversation',
    description: 'Get conversation thread with participants and messages',
  })
  async conversation(
    @Args('pubId', { type: () => String }) pubId: string,
    @CurrentUser('id') userId?: number | null,
  ): Promise<ConversationResponseDto> {
    return this.crmService.getConversation(pubId, userId);
  }

  @Query(() => [ConversationResponseDto], {
    name: 'customerConversations',
    description: 'List all conversations for a customer',
  })
  async customerConversations(
    @Args('customerPubId', { type: () => String }) customerPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ConversationResponseDto[]> {
    return this.crmService.listCustomerConversations(customerPubId, userId);
  }

  @Mutation(() => ConversationResponseDto, {
    name: 'createConversation',
    description: 'Start a new conversation thread with a customer',
  })
  async createConversation(
    @CurrentUser('id') userId: number,
    @Args('input') input: CreateConversationInput,
  ): Promise<ConversationResponseDto> {
    return this.crmService.createConversation(userId, input);
  }

  @Mutation(() => MessageResponseDto, {
    name: 'sendMessage',
    description: 'Send a message in a conversation (broadcasts in real-time)',
  })
  async sendMessage(
    @CurrentUser('id') userId: number,
    @Args('input') input: SendMessageInput,
  ): Promise<MessageResponseDto> {
    return this.crmService.sendMessage(userId, input);
  }

  @Mutation(() => PublicInquiryResponseDto, {
    name: 'sendPublicInquiry',
    description:
      'Submit an inquiry from public marketing homepage or widget without authentication',
  })
  @Public()
  async sendPublicInquiry(
    @Args('input') input: PublicInquiryInput,
  ): Promise<PublicInquiryResponseDto> {
    return this.crmService.sendPublicInquiry(input);
  }

  // ==========================================
  // REALTIME & PRESENCE METRICS
  // ==========================================

  @Query(() => Int, {
    name: 'unreadMessageCount',
    description: 'Get total unread messages count in a conversation for the current user',
  })
  async unreadMessageCount(
    @Args('conversationPubId', { type: () => String })
    conversationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<number> {
    return this.crmService.getUnreadCount(conversationPubId, userId);
  }

  @Query(() => [String], {
    name: 'onlineUsers',
    description: 'Get list of active online user pubIds for an organization',
  })
  async onlineUsers(
    @Args('organizationPubId', { type: () => String })
    organizationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<string[]> {
    return this.crmService.getOnlineUsers(organizationPubId, userId);
  }

  @Mutation(() => Boolean, {
    name: 'markConversationAsRead',
    description: 'Mark conversation unread messages as read for the current user',
  })
  async markConversationAsRead(
    @Args('conversationPubId', { type: () => String })
    conversationPubId: string,
    @CurrentUser('id') userId: number,
  ): Promise<boolean> {
    return this.crmService.markConversationAsRead(conversationPubId, userId);
  }
}
