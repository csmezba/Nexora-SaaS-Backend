import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CrmService } from '../../../src/crm/crm.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { RealtimeService } from '../../../src/realtime/realtime.service.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';
import { TicketStatus } from '../../../src/crm/enums/ticket-status.enum.js';
import { TicketPriority } from '../../../src/crm/enums/ticket-priority.enum.js';
import { MessageType } from '../../../src/crm/enums/message-type.enum.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import * as UserHelper from '../../../src/user/user.helper.js';
import * as CrmHelper from '../../../src/crm/crm.helper.js';

vi.mock('../../../src/organization/organization.helper.js', () => ({
  findByPubIdOrSlug: vi.fn(),
  findOrgById: vi.fn(),
  findByOrgAndUser: vi.fn(),
  getOrgModel: vi.fn(),
}));

vi.mock('../../../src/user/user.helper.js', () => ({
  findUserById: vi.fn(),
  findUserByPubId: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock('../../../src/crm/crm.helper.js', () => ({
  findCustomerById: vi.fn(),
  findCustomerByPubId: vi.fn(),
  listCustomersByOrg: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  findTicketById: vi.fn(),
  findTicketByPubId: vi.fn(),
  listTicketsByOrg: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  deleteTicket: vi.fn(),
  createTicketComment: vi.fn(),
  findCommentByPubId: vi.fn(),
  updateTicketComment: vi.fn(),
  deleteTicketComment: vi.fn(),
  listCommentsByTicket: vi.fn(),
  createConversation: vi.fn(),
  findConversationById: vi.fn(),
  findConversationByPubId: vi.fn(),
  listConversationsByCustomer: vi.fn(),
  createMessage: vi.fn(),
  listMessagesByConversation: vi.fn(),
  findCustomerByEmailInOrg: vi.fn(),
}));

describe('CrmService', () => {
  let service: CrmService;
  let mockPrisma: Partial<PrismaService>;
  let mockRealtimeService: Partial<RealtimeService>;

  const mockOrg = {
    id: 10,
    pubId: 'org_test123',
    name: 'Test Org',
    slug: 'test-org',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockUser = {
    id: 1,
    pubId: 'usr_test123',
    email: 'admin@nexora.app',
    password: 'hashedpassword',
    firstName: 'Admin',
    lastName: 'User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMember = {
    id: 100,
    pubId: 'mem_test123',
    organizationId: 10,
    userId: 1,
    role: OrganizationRole.ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCustomer = {
    id: 50,
    pubId: 'cus_test123',
    organizationId: 10,
    name: 'Acme Client',
    email: 'client@acme.com',
    phone: '+1 555 1234',
    company: 'Acme Industries',
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTicket = {
    id: 80,
    pubId: 'tkt_test123',
    customerId: 50,
    conversationId: null,
    title: 'Cannot access dashboard',
    description: 'Login loop observed on Edge browser',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    assignedToId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    customer: mockCustomer,
    assignedTo: mockUser,
    comments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as Partial<PrismaService>;
    mockRealtimeService = {
      emit: vi.fn().mockResolvedValue(undefined),
      getDriver: vi.fn().mockReturnValue('socketio'),
    };

    service = new CrmService(
      mockPrisma as PrismaService,
      mockRealtimeService as RealtimeService,
    );

    vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(mockOrg as any);
    vi.mocked(OrgHelper.findOrgById).mockResolvedValue(mockOrg as any);
    vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue(mockMember as any);
    vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUser as any);
    vi.mocked(UserHelper.findUserByPubId).mockResolvedValue(mockUser as any);
  });

  // ==========================================
  // CUSTOMER TESTS
  // ==========================================

  describe('Customer Operations', () => {
    it('should create a customer successfully', async () => {
      vi.mocked(CrmHelper.listCustomersByOrg).mockResolvedValue([]);
      vi.mocked(CrmHelper.createCustomer).mockResolvedValue(mockCustomer as any);

      const result = await service.createCustomer(mockUser.id, {
        organizationPubId: mockOrg.pubId,
        name: 'Acme Client',
        email: 'client@acme.com',
      });

      expect(result.pubId).toBe(mockCustomer.pubId);
      expect(result.name).toBe('Acme Client');
      expect(CrmHelper.createCustomer).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          organizationId: mockOrg.id,
          name: 'Acme Client',
          email: 'client@acme.com',
        }),
      );
    });

    it('should throw BadRequestException if customer email exists in same org', async () => {
      vi.mocked(CrmHelper.listCustomersByOrg).mockResolvedValue([
        mockCustomer as any,
      ]);

      await expect(
        service.createCustomer(mockUser.id, {
          organizationPubId: mockOrg.pubId,
          name: 'Another Name',
          email: 'client@acme.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update customer details', async () => {
      vi.mocked(CrmHelper.findCustomerByPubId).mockResolvedValue(
        mockCustomer as any,
      );
      vi.mocked(CrmHelper.updateCustomer).mockResolvedValue({
        ...mockCustomer,
        company: 'New Company',
      } as any);

      const result = await service.updateCustomer(
        mockCustomer.pubId,
        mockUser.id,
        { company: 'New Company' },
      );

      expect(result.company).toBe('New Company');
      expect(CrmHelper.updateCustomer).toHaveBeenCalledWith(
        mockPrisma,
        mockCustomer.id,
        { company: 'New Company' },
      );
    });

    it('should delete a customer', async () => {
      vi.mocked(CrmHelper.findCustomerByPubId).mockResolvedValue(
        mockCustomer as any,
      );
      vi.mocked(CrmHelper.deleteCustomer).mockResolvedValue(true);

      const result = await service.deleteCustomer(
        mockCustomer.pubId,
        mockUser.id,
      );
      expect(result.success).toBe(true);
      expect(CrmHelper.deleteCustomer).toHaveBeenCalledWith(
        mockPrisma,
        mockCustomer.id,
      );
    });
  });

  // ==========================================
  // TICKET TESTS
  // ==========================================

  describe('Ticket Operations', () => {
    it('should create a ticket and broadcast real-time event', async () => {
      vi.mocked(CrmHelper.findCustomerByPubId).mockResolvedValue(
        mockCustomer as any,
      );
      vi.mocked(CrmHelper.createTicket).mockResolvedValue(mockTicket as any);

      const result = await service.createTicket(mockUser.id, {
        customerPubId: mockCustomer.pubId,
        title: 'Cannot access dashboard',
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
      });

      expect(result.title).toBe('Cannot access dashboard');
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `org:${mockOrg.pubId}:tickets`,
        'ticket:created',
        expect.objectContaining({ pubId: mockTicket.pubId }),
      );
    });

    it('should update ticket status and broadcast real-time event', async () => {
      vi.mocked(CrmHelper.findTicketByPubId).mockResolvedValue(mockTicket as any);
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(CrmHelper.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
      } as any);

      const result = await service.updateTicket(mockTicket.pubId, mockUser.id, {
        status: TicketStatus.RESOLVED,
      });

      expect(result.status).toBe(TicketStatus.RESOLVED);
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `ticket:${mockTicket.pubId}`,
        'ticket:updated',
        expect.objectContaining({ status: TicketStatus.RESOLVED }),
      );
    });

    it('should delete a ticket and broadcast deletion event', async () => {
      vi.mocked(CrmHelper.findTicketByPubId).mockResolvedValue(mockTicket as any);
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(CrmHelper.deleteTicket).mockResolvedValue(true);

      const result = await service.deleteTicket(mockTicket.pubId, mockUser.id);
      expect(result.success).toBe(true);
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `org:${mockOrg.pubId}:tickets`,
        'ticket:deleted',
        { pubId: mockTicket.pubId },
      );
    });
  });

  // ==========================================
  // TICKET COMMENT TESTS
  // ==========================================

  describe('Ticket Comment Operations', () => {
    it('should add comment and broadcast realtime event', async () => {
      const mockComment = {
        id: 200,
        pubId: 'tcm_test123',
        ticketId: mockTicket.id,
        authorId: mockUser.id,
        content: 'Investigating right now',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        author: mockUser,
      };

      vi.mocked(CrmHelper.findTicketByPubId).mockResolvedValue(mockTicket as any);
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(CrmHelper.createTicketComment).mockResolvedValue(
        mockComment as any,
      );

      const result = await service.createTicketComment(mockUser.id, {
        ticketPubId: mockTicket.pubId,
        content: 'Investigating right now',
      });

      expect(result.content).toBe('Investigating right now');
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `ticket:${mockTicket.pubId}`,
        'ticket:comment_added',
        expect.objectContaining({ content: 'Investigating right now' }),
      );
    });
  });

  // ==========================================
  // CONVERSATION & MESSAGING TESTS
  // ==========================================

  describe('Conversation & Messaging Operations', () => {
    it('should send a message and broadcast real-time event to conversation channel', async () => {
      const mockConv = {
        id: 300,
        pubId: 'cnv_test123',
        customerId: mockCustomer.id,
        title: 'Support Inquiry',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMsg = {
        id: 400,
        pubId: 'msg_test123',
        conversationId: mockConv.id,
        senderId: mockUser.id,
        content: 'Hello, how can I help you today?',
        type: MessageType.TEXT,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: mockUser,
      };

      vi.mocked(CrmHelper.findConversationByPubId).mockResolvedValue(
        mockConv as any,
      );
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(CrmHelper.createMessage).mockResolvedValue(mockMsg as any);

      const result = await service.sendMessage(mockUser.id, {
        conversationPubId: mockConv.pubId,
        content: 'Hello, how can I help you today?',
      });

      expect(result.content).toBe('Hello, how can I help you today?');
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `conversation:${mockConv.pubId}`,
        'message:created',
        expect.objectContaining({
          content: 'Hello, how can I help you today?',
        }),
      );
    });

    it('should return conversation thread for authenticated organization member', async () => {
      const mockConv = {
        id: 300,
        pubId: 'cnv_test123',
        customerId: mockCustomer.id,
        title: 'Support Inquiry',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(CrmHelper.findConversationByPubId).mockResolvedValue(
        mockConv as any,
      );
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(OrgHelper.findByOrgAndUser).mockResolvedValue({
        id: 1,
        organizationId: mockOrg.id,
        userId: mockUser.id,
        role: OrganizationRole.ADMIN,
      } as any);
      vi.mocked(OrgHelper.findOrgById).mockResolvedValue(mockOrg as any);

      const result = await service.getConversation(mockConv.pubId, mockUser.id);
      expect(result.pubId).toBe(mockConv.pubId);
      expect(OrgHelper.findByOrgAndUser).toHaveBeenCalledWith(
        mockPrisma,
        mockCustomer.organizationId,
        mockUser.id,
      );
    });

    it('should return conversation thread for public visitor without userId', async () => {
      const mockConv = {
        id: 300,
        pubId: 'cnv_public_test',
        customerId: mockCustomer.id,
        title: 'Homepage Inquiry',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(CrmHelper.findConversationByPubId).mockResolvedValue(
        mockConv as any,
      );
      vi.mocked(CrmHelper.findCustomerById).mockResolvedValue(mockCustomer as any);
      vi.mocked(OrgHelper.findOrgById).mockResolvedValue(mockOrg as any);

      const result = await service.getConversation(mockConv.pubId, null);
      expect(result.pubId).toBe(mockConv.pubId);
      // Public visitors shouldn't trigger org membership check
      expect(OrgHelper.findByOrgAndUser).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // PUBLIC INQUIRY OPERATIONS
  // ==========================================

  describe('Public Inquiry Operations', () => {
    const mockInquiryInput = {
      name: 'Alice Visitor',
      email: 'alice@example.com',
      phone: '+1 555 123 4567',
      content: 'I would like to inquire about enterprise pricing.',
    };

    it('should create new customer, conversation, insert message and emit real-time events', async () => {
      const mockCreatedCustomer = {
        id: 105,
        pubId: 'cus_alice123',
        organizationId: mockOrg.id,
        name: 'Alice Visitor',
        email: 'alice@example.com',
        phone: '+1 555 123 4567',
        company: null,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCreatedConv = {
        id: 310,
        pubId: 'cnv_inquiry123',
        customerId: mockCreatedCustomer.id,
        title: 'Homepage Inquiry - Alice Visitor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: mockCreatedCustomer,
        participants: [],
        messages: [],
      };

      const mockCreatedMsg = {
        id: 410,
        pubId: 'msg_inquiry123',
        conversationId: mockCreatedConv.id,
        senderId: null,
        content: mockInquiryInput.content,
        type: MessageType.TEXT,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: null,
      };

      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(mockOrg as any);
      vi.mocked(CrmHelper.findCustomerByEmailInOrg).mockResolvedValue(null);
      vi.mocked(CrmHelper.createCustomer).mockResolvedValue(
        mockCreatedCustomer as any,
      );
      vi.mocked(CrmHelper.createConversation).mockResolvedValue(
        mockCreatedConv as any,
      );
      vi.mocked(CrmHelper.createMessage).mockResolvedValue(
        mockCreatedMsg as any,
      );

      const result = await service.sendPublicInquiry(mockInquiryInput);

      expect(result.success).toBe(true);
      expect(result.customerPubId).toBe(mockCreatedCustomer.pubId);
      expect(result.conversationPubId).toBe(mockCreatedConv.pubId);
      expect(result.messagePubId).toBe(mockCreatedMsg.pubId);

      // Verify customer was created
      expect(CrmHelper.createCustomer).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          organizationId: mockOrg.id,
          name: 'Alice Visitor',
          email: 'alice@example.com',
        }),
      );

      // Verify conversation was created
      expect(CrmHelper.createConversation).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          customerId: mockCreatedCustomer.id,
          title: 'Homepage Inquiry - Alice Visitor',
        }),
      );

      // Verify message was created with senderId: null
      expect(CrmHelper.createMessage).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          conversationId: mockCreatedConv.id,
          senderId: null,
          content: mockInquiryInput.content,
        }),
      );

      // Verify broadcast to org conversations channel
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `org:${mockOrg.pubId}:conversations`,
        'conversation:created',
        expect.anything(),
      );

      // Verify broadcast to conversation channel
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `conversation:${mockCreatedConv.pubId}`,
        'message:created',
        expect.objectContaining({
          content: mockInquiryInput.content,
        }),
      );
    });

    it('should reuse existing customer and append to existing conversation if conversationPubId is provided', async () => {
      const existingCustomer = {
        id: 105,
        pubId: 'cus_alice123',
        organizationId: mockOrg.id,
        name: 'Alice Visitor',
        email: 'alice@example.com',
      };

      const existingConv = {
        id: 310,
        pubId: 'cnv_inquiry123',
        customerId: existingCustomer.id,
        title: 'Homepage Inquiry - Alice Visitor',
      };

      const followUpMsg = {
        id: 411,
        pubId: 'msg_inquiry456',
        conversationId: existingConv.id,
        senderId: null,
        content: 'Also, do you offer annual discount billing?',
        type: MessageType.TEXT,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: null,
      };

      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(mockOrg as any);
      vi.mocked(CrmHelper.findCustomerByEmailInOrg).mockResolvedValue(
        existingCustomer as any,
      );
      vi.mocked(CrmHelper.findConversationByPubId).mockResolvedValue(
        existingConv as any,
      );
      vi.mocked(CrmHelper.createMessage).mockResolvedValue(
        followUpMsg as any,
      );

      const result = await service.sendPublicInquiry({
        ...mockInquiryInput,
        conversationPubId: existingConv.pubId,
        content: 'Also, do you offer annual discount billing?',
      });

      expect(result.success).toBe(true);
      expect(result.conversationPubId).toBe(existingConv.pubId);
      expect(result.messagePubId).toBe(followUpMsg.pubId);

      // Customer should NOT be re-created
      expect(CrmHelper.createCustomer).not.toHaveBeenCalled();

      // Conversation should NOT be re-created
      expect(CrmHelper.createConversation).not.toHaveBeenCalled();

      // Realtime emit to org should NOT fire for existing conversation
      expect(mockRealtimeService.emit).not.toHaveBeenCalledWith(
        `org:${mockOrg.pubId}:conversations`,
        'conversation:created',
        expect.anything(),
      );

      // Message realtime emit should fire
      expect(mockRealtimeService.emit).toHaveBeenCalledWith(
        `conversation:${existingConv.pubId}`,
        'message:created',
        expect.objectContaining({
          content: 'Also, do you offer annual discount billing?',
        }),
      );
    });

    it('should throw NotFoundException if target organization cannot be resolved', async () => {
      vi.mocked(OrgHelper.findByPubIdOrSlug).mockResolvedValue(null);
      vi.mocked(OrgHelper.getOrgModel).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.sendPublicInquiry(mockInquiryInput),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
