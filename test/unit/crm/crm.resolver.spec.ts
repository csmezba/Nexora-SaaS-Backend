import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CrmResolver } from '../../../src/crm/crm.resolver.js';
import { CrmService } from '../../../src/crm/crm.service.js';
import { TicketStatus } from '../../../src/crm/enums/ticket-status.enum.js';
import { TicketPriority } from '../../../src/crm/enums/ticket-priority.enum.js';

describe('CrmResolver', () => {
  let resolver: CrmResolver;
  let mockCrmService: Partial<CrmService>;

  beforeEach(() => {
    mockCrmService = {
      getCustomer: vi.fn(),
      listCustomers: vi.fn(),
      createCustomer: vi.fn(),
      updateCustomer: vi.fn(),
      deleteCustomer: vi.fn(),
      getTicket: vi.fn(),
      listTickets: vi.fn(),
      createTicket: vi.fn(),
      updateTicket: vi.fn(),
      assignTicket: vi.fn(),
      deleteTicket: vi.fn(),
      listTicketComments: vi.fn(),
      createTicketComment: vi.fn(),
      updateTicketComment: vi.fn(),
      deleteTicketComment: vi.fn(),
      getConversation: vi.fn(),
      listCustomerConversations: vi.fn(),
      createConversation: vi.fn(),
      sendMessage: vi.fn(),
      getUnreadCount: vi.fn(),
      getOnlineUsers: vi.fn(),
      markConversationAsRead: vi.fn(),
    };

    resolver = new CrmResolver(mockCrmService as CrmService);
  });

  it('should delegate customer query to service', async () => {
    vi.mocked(mockCrmService.getCustomer!).mockResolvedValue({
      id: 1,
      pubId: 'cus_123',
      name: 'Customer 1',
    } as any);

    const res = await resolver.customer('cus_123', 5);
    expect(mockCrmService.getCustomer).toHaveBeenCalledWith('cus_123', 5);
    expect(res.pubId).toBe('cus_123');
  });

  it('should delegate createTicket mutation to service', async () => {
    const input = {
      customerPubId: 'cus_123',
      title: 'Bug Report',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
    };
    vi.mocked(mockCrmService.createTicket!).mockResolvedValue({
      id: 10,
      pubId: 'tkt_123',
      title: 'Bug Report',
    } as any);

    const res = await resolver.createTicket(5, input);
    expect(mockCrmService.createTicket).toHaveBeenCalledWith(5, input);
    expect(res.pubId).toBe('tkt_123');
  });

  it('should delegate sendMessage mutation to service', async () => {
    const input = {
      conversationPubId: 'cnv_123',
      content: 'Hello!',
    };
    vi.mocked(mockCrmService.sendMessage!).mockResolvedValue({
      id: 20,
      pubId: 'msg_123',
      content: 'Hello!',
    } as any);

    const res = await resolver.sendMessage(5, input);
    expect(mockCrmService.sendMessage).toHaveBeenCalledWith(5, input);
    expect(res.pubId).toBe('msg_123');
  });

  it('should delegate unreadMessageCount query to service with userId', async () => {
    vi.mocked(mockCrmService.getUnreadCount!).mockResolvedValue(3);

    const res = await resolver.unreadMessageCount('cnv_123', 5);
    expect(mockCrmService.getUnreadCount).toHaveBeenCalledWith('cnv_123', 5);
    expect(res).toBe(3);
  });

  it('should delegate onlineUsers query to service with userId', async () => {
    vi.mocked(mockCrmService.getOnlineUsers!).mockResolvedValue(['usr_1', 'usr_2']);

    const res = await resolver.onlineUsers('org_123', 5);
    expect(mockCrmService.getOnlineUsers).toHaveBeenCalledWith('org_123', 5);
    expect(res).toEqual(['usr_1', 'usr_2']);
  });

  it('should delegate markConversationAsRead mutation to service with userId', async () => {
    vi.mocked(mockCrmService.markConversationAsRead!).mockResolvedValue(true);

    const res = await resolver.markConversationAsRead('cnv_123', 5);
    expect(mockCrmService.markConversationAsRead).toHaveBeenCalledWith('cnv_123', 5);
    expect(res).toBe(true);
  });
});
