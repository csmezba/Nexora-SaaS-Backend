import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService, runTransaction } from '../prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { RedisService } from '../redis/redis.service.js';
import * as CrmHelper from './crm.helper.js';
import * as OrgHelper from '../organization/organization.helper.js';
import * as UserHelper from '../user/user.helper.js';
import { OrganizationRole } from '../organization/enums/organization-role.enum.js';
import type {
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
import type {
  ConversationWithDetails,
  CustomerWithRelations,
  MessageWithSender,
  PrismaCustomerRecord,
  TicketCommentWithAuthor,
  TicketWithDetails,
} from './types/crm.types.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';
import type { UserResponseDto } from '../auth/dto/auth.dto.js';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  // ==========================================
  // PERMISSION & SCOPE RESOLUTION (WITH REDIS CACHE)
  // ==========================================

  private async resolveUser(userPubIdOrId: string | number) {
    let user: PrismaUserRecord | null = null;
    if (typeof userPubIdOrId === 'number') {
      user = await UserHelper.findUserById(this.prisma, userPubIdOrId);
    } else if (userPubIdOrId.includes('@')) {
      user = await UserHelper.findUserByEmail(this.prisma, userPubIdOrId);
    } else {
      user = await UserHelper.findUserByPubId(this.prisma, userPubIdOrId);
    }

    if (!user) {
      throw new NotFoundException(`User '${userPubIdOrId}' not found`);
    }
    return user;
  }

  private async resolveOrg(orgPubId: string) {
    const org = await OrgHelper.findByPubIdOrSlug(this.prisma, orgPubId);
    if (!org) {
      throw new NotFoundException(`Organization '${orgPubId}' not found`);
    }
    return org;
  }

  private async resolveCustomer(customerPubId: string) {
    const cacheKey = `crm:customer:${customerPubId}`;
    if (this.redisService) {
      const cached = await this.redisService.get<PrismaCustomerRecord>(cacheKey);
      if (cached) return cached;
    }

    const customer = await CrmHelper.findCustomerByPubId(
      this.prisma,
      customerPubId,
    );
    if (!customer) {
      throw new NotFoundException(`Customer '${customerPubId}' not found`);
    }

    if (this.redisService) {
      // Cache customer metadata for 10 minutes (600s)
      await this.redisService.set(cacheKey, customer, 600);
    }
    return customer;
  }

  private async resolveTicket(ticketPubId: string) {
    const ticket = await CrmHelper.findTicketByPubId(this.prisma, ticketPubId);
    if (!ticket) {
      throw new NotFoundException(`Ticket '${ticketPubId}' not found`);
    }
    return ticket;
  }

  private async resolveComment(commentPubId: string) {
    const comment = await CrmHelper.findCommentByPubId(
      this.prisma,
      commentPubId,
    );
    if (!comment) {
      throw new NotFoundException(`Comment '${commentPubId}' not found`);
    }
    return comment;
  }

  private async resolveConversation(conversationPubId: string) {
    const cacheKey = `crm:conversation:${conversationPubId}`;
    if (this.redisService) {
      const cached =
        await this.redisService.get<ConversationWithDetails>(cacheKey);
      if (cached) return cached;
    }

    const conversation = await CrmHelper.findConversationByPubId(
      this.prisma,
      conversationPubId,
    );
    if (!conversation) {
      throw new NotFoundException(
        `Conversation '${conversationPubId}' not found`,
      );
    }

    if (this.redisService) {
      // Cache conversation details for 10 minutes (600s)
      await this.redisService.set(cacheKey, conversation, 600);
    }
    return conversation;
  }

  private async ensureOrgMember(organizationId: number, userId: number) {
    const cacheKey = `org:${organizationId}:user:${userId}:member`;
    if (this.redisService) {
      const cached =
        await this.redisService.get<
          Awaited<ReturnType<typeof OrgHelper.findByOrgAndUser>>
        >(cacheKey);
      if (cached) return cached;
    }

    const member = await OrgHelper.findByOrgAndUser(
      this.prisma,
      organizationId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (this.redisService) {
      // Cache member role for 10 minutes (600s)
      await this.redisService.set(cacheKey, member, 600);
    }
    return member;
  }

  private async ensureCanManageCrm(organizationId: number, userId: number) {
    const member = await this.ensureOrgMember(organizationId, userId);
    const isElevated =
      member.role === OrganizationRole.OWNER ||
      member.role === OrganizationRole.ADMIN ||
      member.role === OrganizationRole.MANAGER ||
      member.role === OrganizationRole.DEVELOPER ||
      member.role === OrganizationRole.QA;

    if (!isElevated) {
      throw new ForbiddenException(
        'Insufficient permissions to modify CRM resources',
      );
    }
    return member;
  }

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================

  async createCustomer(
    userId: number,
    input: CreateCustomerInput,
  ): Promise<CustomerResponseDto> {
    const org = await this.resolveOrg(input.organizationPubId);
    await this.ensureCanManageCrm(org.id, userId);

    if (input.email) {
      const existing = await CrmHelper.listCustomersByOrg(this.prisma, org.id);
      const emailLower = input.email.toLowerCase().trim();
      const duplicate = existing.find(
        (c) => c.email && c.email.toLowerCase().trim() === emailLower,
      );
      if (duplicate) {
        throw new BadRequestException(
          `Customer with email '${input.email}' already exists in this organization`,
        );
      }
    }

    const customer = await CrmHelper.createCustomer(this.prisma, {
      organizationId: org.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
    });

    return this.mapCustomerToDto(customer, org.pubId);
  }

  async updateCustomer(
    pubId: string,
    userId: number,
    input: UpdateCustomerInput,
  ): Promise<CustomerResponseDto> {
    const customer = await this.resolveCustomer(pubId);
    await this.ensureCanManageCrm(customer.organizationId, userId);

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);

    const updated = await CrmHelper.updateCustomer(
      this.prisma,
      customer.id,
      input,
    );
    if (!updated) {
      throw new NotFoundException('Customer not found after update');
    }

    if (this.redisService) {
      await this.redisService.del(`crm:customer:${pubId}`);
    }

    return this.mapCustomerToDto(updated, org?.pubId ?? '');
  }

  async deleteCustomer(
    pubId: string,
    userId: number,
  ): Promise<DeleteCustomerResponseDto> {
    const customer = await this.resolveCustomer(pubId);
    await this.ensureCanManageCrm(customer.organizationId, userId);

    await CrmHelper.deleteCustomer(this.prisma, customer.id);

    if (this.redisService) {
      await this.redisService.del(`crm:customer:${pubId}`);
    }

    return {
      success: true,
      message: `Customer '${pubId}' has been deleted`,
    };
  }

  async getCustomer(
    pubId: string,
    userId: number,
  ): Promise<CustomerResponseDto> {
    const customer = await this.resolveCustomer(pubId);
    await this.ensureOrgMember(customer.organizationId, userId);

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);
    const tickets = await CrmHelper.listTicketsByOrg(
      this.prisma,
      customer.organizationId,
      { customerId: customer.id },
    );

    return {
      ...this.mapCustomerToDto(customer, org?.pubId ?? ''),
      ticketCount: tickets.length,
    };
  }

  async listCustomers(
    organizationPubId: string,
    userId: number,
    filter?: CustomerFilterInput,
  ): Promise<CustomerResponseDto[]> {
    const org = await this.resolveOrg(organizationPubId);
    await this.ensureOrgMember(org.id, userId);

    const customers = await CrmHelper.listCustomersByOrg(
      this.prisma,
      org.id,
      filter,
    );

    return customers.map((c) => this.mapCustomerToDto(c, org.pubId));
  }

  // ==========================================
  // TICKET MANAGEMENT
  // ==========================================

  async createTicket(
    userId: number,
    input: CreateTicketInput,
  ): Promise<TicketResponseDto> {
    const customer = await this.resolveCustomer(input.customerPubId);
    await this.ensureCanManageCrm(customer.organizationId, userId);

    let assignedToId: number | undefined;
    if (input.assignedToUserPubId) {
      const assignedUser = await this.resolveUser(input.assignedToUserPubId);
      await this.ensureOrgMember(customer.organizationId, assignedUser.id);
      assignedToId = assignedUser.id;
    }

    let conversationId: number | undefined;
    if (input.conversationPubId) {
      const conv = await this.resolveConversation(input.conversationPubId);
      conversationId = conv.id;
    }

    const ticket = await CrmHelper.createTicket(this.prisma, {
      customerId: customer.id,
      conversationId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignedToId,
    });

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);
    const dto = this.mapTicketToDto(ticket, org?.pubId ?? '');

    // Realtime broadcast to organization ticket channel
    await this.realtimeService.emit(
      `org:${org?.pubId}:tickets`,
      'ticket:created',
      dto,
    );

    return dto;
  }

  async updateTicket(
    pubId: string,
    userId: number,
    input: UpdateTicketInput,
  ): Promise<TicketResponseDto> {
    const ticket = await this.resolveTicket(pubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      ticket.customerId,
    );
    if (!customer) throw new NotFoundException('Ticket customer not found');

    await this.ensureCanManageCrm(customer.organizationId, userId);

    let assignedToId: number | null | undefined = undefined;
    if (input.assignedToUserPubId !== undefined) {
      if (input.assignedToUserPubId) {
        const assignedUser = await this.resolveUser(input.assignedToUserPubId);
        await this.ensureOrgMember(customer.organizationId, assignedUser.id);
        assignedToId = assignedUser.id;
      } else {
        assignedToId = null;
      }
    }

    const updated = await CrmHelper.updateTicket(this.prisma, ticket.id, {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignedToId,
    });

    if (!updated) throw new NotFoundException('Ticket not found after update');

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);
    const dto = this.mapTicketToDto(updated, org?.pubId ?? '');

    // Realtime broadcast to ticket-specific and org-level channels
    await this.realtimeService.emit(`ticket:${pubId}`, 'ticket:updated', dto);
    await this.realtimeService.emit(
      `org:${org?.pubId}:tickets`,
      'ticket:updated',
      dto,
    );

    return dto;
  }

  async assignTicket(
    userId: number,
    input: AssignTicketInput,
  ): Promise<TicketResponseDto> {
    return this.updateTicket(input.ticketPubId, userId, {
      assignedToUserPubId: input.assignedToUserPubId ?? undefined,
    });
  }

  async deleteTicket(
    pubId: string,
    userId: number,
  ): Promise<DeleteTicketResponseDto> {
    const ticket = await this.resolveTicket(pubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      ticket.customerId,
    );
    if (!customer) throw new NotFoundException('Ticket customer not found');

    await this.ensureCanManageCrm(customer.organizationId, userId);
    await CrmHelper.deleteTicket(this.prisma, ticket.id);

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);
    await this.realtimeService.emit(
      `org:${org?.pubId}:tickets`,
      'ticket:deleted',
      { pubId },
    );

    return {
      success: true,
      message: `Ticket '${pubId}' has been deleted`,
    };
  }

  async getTicket(pubId: string, userId: number): Promise<TicketResponseDto> {
    const ticket = await this.resolveTicket(pubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      ticket.customerId,
    );
    if (!customer) throw new NotFoundException('Ticket customer not found');

    await this.ensureOrgMember(customer.organizationId, userId);
    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);

    return this.mapTicketToDto(ticket, org?.pubId ?? '');
  }

  async listTickets(
    organizationPubId: string,
    userId: number,
    filter?: TicketFilterInput,
  ): Promise<TicketResponseDto[]> {
    const org = await this.resolveOrg(organizationPubId);
    await this.ensureOrgMember(org.id, userId);

    let assignedToId: number | undefined;
    if (filter?.assignedToUserPubId) {
      const u = await this.resolveUser(filter.assignedToUserPubId);
      assignedToId = u.id;
    }

    let customerId: number | undefined;
    if (filter?.customerPubId) {
      const c = await this.resolveCustomer(filter.customerPubId);
      customerId = c.id;
    }

    const tickets = await CrmHelper.listTicketsByOrg(this.prisma, org.id, {
      status: filter?.status,
      priority: filter?.priority,
      assignedToId,
      customerId,
      search: filter?.search,
    });

    return tickets.map((t) => this.mapTicketToDto(t, org.pubId));
  }

  // ==========================================
  // TICKET COMMENT MANAGEMENT
  // ==========================================

  async createTicketComment(
    userId: number,
    input: CreateTicketCommentInput,
  ): Promise<TicketCommentResponseDto> {
    const ticket = await this.resolveTicket(input.ticketPubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      ticket.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');

    await this.ensureOrgMember(customer.organizationId, userId);

    const comment = await CrmHelper.createTicketComment(this.prisma, {
      ticketId: ticket.id,
      authorId: userId,
      content: input.content,
    });

    const dto = this.mapCommentToDto(comment, ticket.pubId);

    // Realtime broadcast to ticket channel
    await this.realtimeService.emit(
      `ticket:${ticket.pubId}`,
      'ticket:comment_added',
      dto,
    );

    return dto;
  }

  async updateTicketComment(
    commentPubId: string,
    userId: number,
    input: UpdateTicketCommentInput,
  ): Promise<TicketCommentResponseDto> {
    const comment = await this.resolveComment(commentPubId);
    if (comment.authorId !== userId) {
      throw new ForbiddenException(
        'You can only edit your own ticket comments',
      );
    }

    const updated = await CrmHelper.updateTicketComment(
      this.prisma,
      comment.id,
      input.content,
    );
    if (!updated) throw new NotFoundException('Comment not found after update');

    const ticket = await CrmHelper.findTicketById(this.prisma, comment.ticketId);
    return this.mapCommentToDto(updated, ticket?.pubId ?? '');
  }

  async deleteTicketComment(
    commentPubId: string,
    userId: number,
  ): Promise<DeleteTicketCommentResponseDto> {
    const comment = await this.resolveComment(commentPubId);
    const ticket = await CrmHelper.findTicketById(this.prisma, comment.ticketId);
    const customer = ticket
      ? await CrmHelper.findCustomerById(this.prisma, ticket.customerId)
      : null;

    if (customer) {
      const member = await this.ensureOrgMember(customer.organizationId, userId);
      const isElevated =
        member.role === OrganizationRole.OWNER ||
        member.role === OrganizationRole.ADMIN;
      if (comment.authorId !== userId && !isElevated) {
        throw new ForbiddenException(
          'Insufficient permissions to delete this comment',
        );
      }
    } else if (comment.authorId !== userId) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this comment',
      );
    }

    await CrmHelper.deleteTicketComment(this.prisma, comment.id);
    return {
      success: true,
      message: `Comment '${commentPubId}' has been deleted`,
    };
  }

  async listTicketComments(
    ticketPubId: string,
    userId: number,
  ): Promise<TicketCommentResponseDto[]> {
    const ticket = await this.resolveTicket(ticketPubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      ticket.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');

    await this.ensureOrgMember(customer.organizationId, userId);
    const comments = await CrmHelper.listCommentsByTicket(
      this.prisma,
      ticket.id,
    );

    return comments.map((c) => this.mapCommentToDto(c, ticket.pubId));
  }

  // ==========================================
  // CONVERSATIONS & MESSAGING
  // ==========================================

  async createConversation(
    userId: number,
    input: CreateConversationInput,
  ): Promise<ConversationResponseDto> {
    const customer = await this.resolveCustomer(input.customerPubId);
    await this.ensureCanManageCrm(customer.organizationId, userId);

    const participantUserIds: number[] = [userId];
    if (input.participantUserPubIds?.length) {
      for (const pubId of input.participantUserPubIds) {
        const u = await this.resolveUser(pubId);
        await this.ensureOrgMember(customer.organizationId, u.id);
        if (!participantUserIds.includes(u.id)) {
          participantUserIds.push(u.id);
        }
      }
    }

    const conv = await runTransaction(this.prisma, async (tx) => {
      return CrmHelper.createConversation(tx, {
        customerId: customer.id,
        title: input.title,
        participantUserIds,
      });
    });

    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);
    return this.mapConversationToDto(conv, org?.pubId ?? '');
  }

  async getConversation(
    pubId: string,
    userId?: number | null,
  ): Promise<ConversationResponseDto> {
    const conv = await this.resolveConversation(pubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      conv.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');

    if (userId) {
      await this.ensureOrgMember(customer.organizationId, userId);

      // Clear unread messages count for current user in Redis
      if (this.redisService) {
        const currentUser = await UserHelper.findUserById(this.prisma, userId);
        if (currentUser?.pubId) {
          await this.redisService.clearUnread(conv.pubId, currentUser.pubId);
        }
      }
    }
    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);

    return this.mapConversationToDto(conv, org?.pubId ?? '');
  }

  async listCustomerConversations(
    customerPubId: string,
    userId: number,
  ): Promise<ConversationResponseDto[]> {
    const customer = await this.resolveCustomer(customerPubId);
    await this.ensureOrgMember(customer.organizationId, userId);
    const org = await OrgHelper.findOrgById(this.prisma, customer.organizationId);

    const conversations = await CrmHelper.listConversationsByCustomer(
      this.prisma,
      customer.id,
    );

    return conversations.map((c) =>
      this.mapConversationToDto(c, org?.pubId ?? ''),
    );
  }

  async sendMessage(
    userId: number,
    input: SendMessageInput,
  ): Promise<MessageResponseDto> {
    const conv = await this.resolveConversation(input.conversationPubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      conv.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');

    await this.ensureOrgMember(customer.organizationId, userId);

    const message = await CrmHelper.createMessage(this.prisma, {
      conversationId: conv.id,
      senderId: userId,
      content: input.content,
      type: input.type,
    });

    const dto = this.mapMessageToDto(message, conv.pubId);

    // Invalidate conversation cache & increment unread counter in Redis
    if (this.redisService) {
      await this.redisService.del(`crm:conversation:${conv.pubId}`);

      if (conv.participants?.length) {
        for (const p of conv.participants) {
          if (p.user?.pubId && p.userId !== userId) {
            await this.redisService.incrementUnread(conv.pubId, p.user.pubId);
          }
        }
      }
    }

    // Realtime broadcast to the specific conversation channel
    await this.realtimeService.emit(
      `conversation:${conv.pubId}`,
      'message:created',
      dto,
    );

    return dto;
  }

  // ==========================================
  // PUBLIC INQUIRY
  // ==========================================

  async sendPublicInquiry(
    input: PublicInquiryInput,
  ): Promise<PublicInquiryResponseDto> {
    // Check rate limit via Redis (max 5 inquiries per minute per email)
    if (this.redisService) {
      const rateLimitKey = `rate_limit:inquiry:${input.email.toLowerCase().trim()}`;
      const { allowed } = await this.redisService.checkRateLimit(
        rateLimitKey,
        5,
        60,
      );
      if (!allowed) {
        throw new BadRequestException(
          'Too many inquiries submitted. Please wait a minute and try again.',
        );
      }
    }

    // 1. Resolve target organization
    let org = null;
    if (input.organizationPubId) {
      org = await OrgHelper.findByPubIdOrSlug(
        this.prisma,
        input.organizationPubId,
      );
    }

    if (!org) {
      const defaultSlug = process.env.DEFAULT_ORG_SLUG || 'nexora-labs';
      org = await OrgHelper.findByPubIdOrSlug(this.prisma, defaultSlug);
    }

    if (!org) {
      const orgModel = OrgHelper.getOrgModel(this.prisma);
      org = await orgModel.first();
    }

    if (!org) {
      throw new NotFoundException('Target organization could not be resolved');
    }

    // 2. Find or create customer in target organization
    let customer = await CrmHelper.findCustomerByEmailInOrg(
      this.prisma,
      org.id,
      input.email,
    );

    if (!customer) {
      customer = await CrmHelper.createCustomer(this.prisma, {
        organizationId: org.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
      });
    }

    // 3. Find or create conversation thread
    let conv: ConversationWithDetails | null = null;
    let isNewConv = false;

    if (input.conversationPubId) {
      const existingConv = await CrmHelper.findConversationByPubId(
        this.prisma,
        input.conversationPubId,
      );
      if (existingConv && existingConv.customerId === customer.id) {
        conv = existingConv;
      }
    }

    if (!conv) {
      isNewConv = true;
      conv = await CrmHelper.createConversation(this.prisma, {
        customerId: customer.id,
        title: `Homepage Inquiry - ${customer.name}`,
      });
    }

    // 4. Create customer message (senderId: null signifies customer message)
    const message = await CrmHelper.createMessage(this.prisma, {
      conversationId: conv.id,
      senderId: null,
      content: input.content,
    });

    const msgDto = this.mapMessageToDto(message, conv.pubId);

    // 5. Real-time broadcasts
    if (isNewConv) {
      const convDto = this.mapConversationToDto(conv, org.pubId);
      await this.realtimeService.emit(
        `org:${org.pubId}:conversations`,
        'conversation:created',
        convDto,
      );
    }

    await this.realtimeService.emit(
      `conversation:${conv.pubId}`,
      'message:created',
      msgDto,
    );

    return {
      success: true,
      customerPubId: customer.pubId,
      conversationPubId: conv.pubId,
      messagePubId: message.pubId,
    };
  }

  // ==========================================
  // DTO MAPPERS
  // ==========================================

  private mapCustomerToDto(
    c: PrismaCustomerRecord | CustomerWithRelations,
    organizationPubId: string,
  ): CustomerResponseDto {
    const ticketCount = 'tickets' in c ? c.tickets?.length : undefined;
    return {
      id: c.id,
      pubId: c.pubId,
      organizationPubId,
      name: c.name,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      company: c.company ?? undefined,
      ticketCount,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    };
  }

  private mapTicketToDto(
    t: TicketWithDetails,
    organizationPubId: string,
  ): TicketResponseDto {
    return {
      id: t.id,
      pubId: t.pubId,
      customerPubId: t.customer?.pubId ?? '',
      customer: t.customer
        ? this.mapCustomerToDto(t.customer, organizationPubId)
        : undefined,
      title: t.title,
      description: t.description ?? undefined,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo
        ? (this.mapUserToDto(t.assignedTo) as UserResponseDto)
        : undefined,
      comments: (t.comments || []).map((c) => this.mapCommentToDto(c, t.pubId)),
      commentsCount: t.comments?.length ?? 0,
      resolvedAt: t.resolvedAt ? new Date(t.resolvedAt) : undefined,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    };
  }

  private mapCommentToDto(
    c: TicketCommentWithAuthor,
    ticketPubId: string,
  ): TicketCommentResponseDto {
    return {
      id: c.id,
      pubId: c.pubId,
      ticketPubId,
      author: c.author
        ? (this.mapUserToDto(c.author) as UserResponseDto)
        : undefined,
      content: c.content,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    };
  }

  private mapConversationToDto(
    c: ConversationWithDetails,
    organizationPubId: string,
  ): ConversationResponseDto {
    return {
      id: c.id,
      pubId: c.pubId,
      customerPubId: c.customer?.pubId ?? '',
      customer: c.customer
        ? this.mapCustomerToDto(c.customer, organizationPubId)
        : undefined,
      title: c.title ?? undefined,
      participants: (c.participants || [])
        .map((p) => p.user)
        .filter((u): u is PrismaUserRecord => Boolean(u))
        .map((u) => this.mapUserToDto(u) as UserResponseDto),
      messages: (c.messages || []).map((m) => this.mapMessageToDto(m, c.pubId)),
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    };
  }

  private mapMessageToDto(
    m: MessageWithSender,
    conversationPubId: string,
  ): MessageResponseDto {
    return {
      id: m.id,
      pubId: m.pubId,
      conversationPubId,
      sender: m.sender
        ? (this.mapUserToDto(m.sender) as UserResponseDto)
        : undefined,
      content: m.content,
      type: m.type,
      createdAt: new Date(m.createdAt),
    };
  }

  private mapUserToDto(user?: PrismaUserRecord | null): UserResponseDto | undefined {
    if (!user) return undefined;
    return {
      pubId: user.pubId,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  // ==========================================
  // REDIS REALTIME & PRESENCE METRICS
  // ==========================================

  async getUnreadCount(
    conversationPubId: string,
    userId: number,
  ): Promise<number> {
    if (!this.redisService) return 0;
    const conv = await this.resolveConversation(conversationPubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      conv.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');
    await this.ensureOrgMember(customer.organizationId, userId);

    const user = await UserHelper.findUserById(this.prisma, userId);
    if (!user?.pubId) return 0;

    return this.redisService.getUnread(conv.pubId, user.pubId);
  }

  async getOnlineUsers(orgPubId: string, userId: number): Promise<string[]> {
    if (!this.redisService) return [];
    const org = await this.resolveOrg(orgPubId);
    await this.ensureOrgMember(org.id, userId);
    return this.redisService.getOnlineUsers(org.pubId);
  }

  async markConversationAsRead(
    conversationPubId: string,
    userId: number,
  ): Promise<boolean> {
    if (!this.redisService) return true;
    const conv = await this.resolveConversation(conversationPubId);
    const customer = await CrmHelper.findCustomerById(
      this.prisma,
      conv.customerId,
    );
    if (!customer) throw new NotFoundException('Customer not found');
    await this.ensureOrgMember(customer.organizationId, userId);

    const user = await UserHelper.findUserById(this.prisma, userId);
    if (user?.pubId) {
      await this.redisService.clearUnread(conv.pubId, user.pubId);
    }
    return true;
  }
}
