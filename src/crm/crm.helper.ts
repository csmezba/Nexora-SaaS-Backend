import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import * as UserHelper from '../user/user.helper.js';
import { TicketStatus } from './enums/ticket-status.enum.js';
import { TicketPriority } from './enums/ticket-priority.enum.js';
import { MessageType } from './enums/message-type.enum.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  ConversationParticipantWithUser,
  ConversationWithDetails,
  CreateConversationData,
  CreateCustomerData,
  CreateMessageData,
  CreateTicketCommentData,
  CreateTicketData,
  CustomerWithRelations,
  MessageWithSender,
  PrismaConversationParticipantRecord,
  PrismaConversationRecord,
  PrismaCustomerRecord,
  PrismaMessageRecord,
  PrismaTicketCommentRecord,
  PrismaTicketRecord,
  TicketCommentWithAuthor,
  TicketWithDetails,
  UpdateCustomerData,
  UpdateTicketData,
} from './types/crm.types.js';

// ==========================================
// MODEL ACCESSORS
// ==========================================

function getModel<T>(prisma: PrismaService, name: string): PrismaOrmModel<T> {
  const orm = prisma.db.orm as unknown as Record<string, PrismaOrmModel<T>>;
  const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
  return (
    orm[name] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<T>>)?.[name] ||
    orm[lowerName]!
  );
}

export function getCustomerModel(prisma: PrismaService): PrismaOrmModel<PrismaCustomerRecord> {
  return getModel<PrismaCustomerRecord>(prisma, 'Customer');
}

export function getTicketModel(prisma: PrismaService): PrismaOrmModel<PrismaTicketRecord> {
  return getModel<PrismaTicketRecord>(prisma, 'Ticket');
}

export function getTicketCommentModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaTicketCommentRecord> {
  return getModel<PrismaTicketCommentRecord>(prisma, 'TicketComment');
}

export function getConversationModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaConversationRecord> {
  return getModel<PrismaConversationRecord>(prisma, 'Conversation');
}

export function getConversationParticipantModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaConversationParticipantRecord> {
  return getModel<PrismaConversationParticipantRecord>(prisma, 'ConversationParticipant');
}

export function getMessageModel(prisma: PrismaService): PrismaOrmModel<PrismaMessageRecord> {
  return getModel<PrismaMessageRecord>(prisma, 'Message');
}

// ==========================================
// HYDRATION HELPERS
// ==========================================

export async function hydrateTicket(
  prisma: PrismaService,
  record: PrismaTicketRecord,
): Promise<TicketWithDetails> {
  const customer = await findCustomerById(prisma, record.customerId);
  const assignedTo = record.assignedToId
    ? await UserHelper.findUserById(prisma, record.assignedToId)
    : null;
  const comments = await listCommentsByTicket(prisma, record.id);

  return {
    ...record,
    customer,
    assignedTo,
    comments,
  };
}

export async function hydrateComment(
  prisma: PrismaService,
  record: PrismaTicketCommentRecord,
): Promise<TicketCommentWithAuthor> {
  const author = await UserHelper.findUserById(prisma, record.authorId);
  return {
    ...record,
    author,
  };
}

export async function hydrateConversation(
  prisma: PrismaService,
  record: PrismaConversationRecord,
): Promise<ConversationWithDetails> {
  const customer = await findCustomerById(prisma, record.customerId);
  const participantModel = getConversationParticipantModel(prisma);
  const rawParticipants = await participantModel
    .where((p: { conversationId: { eq: (val: number) => unknown } }) =>
      p.conversationId.eq(record.id),
    )
    .all();

  const participants: ConversationParticipantWithUser[] = [];
  for (const part of rawParticipants || []) {
    const user = await UserHelper.findUserById(prisma, part.userId);
    participants.push({
      ...part,
      user,
    });
  }

  const messages = await listMessagesByConversation(prisma, record.id);

  return {
    ...record,
    customer,
    participants,
    messages,
  };
}

// ==========================================
// CUSTOMER OPERATIONS
// ==========================================

export async function findCustomerById(
  prisma: PrismaService,
  id: number,
): Promise<PrismaCustomerRecord | null> {
  const model = getCustomerModel(prisma);
  const record = await model.first({ id });
  return record || null;
}

export async function findCustomerByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<PrismaCustomerRecord | null> {
  const model = getCustomerModel(prisma);
  const record = await model
    .where((c: { pubId: { eq: (val: string) => unknown } }) =>
      c.pubId.eq(pubId.trim()),
    )
    .first();
  return record || null;
}

export async function listCustomersByOrg(
  prisma: PrismaService,
  organizationId: number,
  filters?: { search?: string },
): Promise<CustomerWithRelations[]> {
  const model = getCustomerModel(prisma);
  const records = await model
    .where((c: { organizationId: { eq: (val: number) => unknown } }) =>
      c.organizationId.eq(organizationId),
    )
    .all();

  let filtered = records || [];
  if (filters?.search) {
    const term = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term)),
    );
  }

  const ticketModel = getTicketModel(prisma);
  const allTickets = await ticketModel.all();

  return filtered.map((c) => {
    const tickets = (allTickets || []).filter((t) => t.customerId === c.id);
    return {
      ...c,
      tickets,
    };
  });
}

export async function createCustomer(
  prisma: PrismaService,
  data: CreateCustomerData,
): Promise<PrismaCustomerRecord> {
  const model = getCustomerModel(prisma);
  const now = new Date().toISOString();

  return model.create({
    pubId: generatePubId('cus'),
    organizationId: data.organizationId,
    name: data.name.trim(),
    email: data.email?.trim() ?? null,
    phone: data.phone?.trim() ?? null,
    company: data.company?.trim() ?? null,
    metadata: data.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCustomer(
  prisma: PrismaService,
  id: number,
  data: UpdateCustomerData,
): Promise<PrismaCustomerRecord | null> {
  const model = getCustomerModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload['name'] = data.name.trim();
  if (data.email !== undefined) updatePayload['email'] = data.email ? data.email.trim() : null;
  if (data.phone !== undefined) updatePayload['phone'] = data.phone ? data.phone.trim() : null;
  if (data.company !== undefined) updatePayload['company'] = data.company ? data.company.trim() : null;
  if (data.metadata !== undefined) updatePayload['metadata'] = data.metadata;

  await model.where({ id }).update(updatePayload);
  return findCustomerById(prisma, id);
}

export async function deleteCustomer(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const model = getCustomerModel(prisma);
  await model.where({ id }).delete();
  return true;
}

// ==========================================
// TICKET OPERATIONS
// ==========================================

export async function findTicketById(
  prisma: PrismaService,
  id: number,
): Promise<TicketWithDetails | null> {
  const model = getTicketModel(prisma);
  const record = await model.first({ id });
  if (!record) return null;
  return hydrateTicket(prisma, record);
}

export async function findTicketByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<TicketWithDetails | null> {
  const model = getTicketModel(prisma);
  const record = await model
    .where((t: { pubId: { eq: (val: string) => unknown } }) =>
      t.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  return hydrateTicket(prisma, record);
}

export async function listTicketsByOrg(
  prisma: PrismaService,
  organizationId: number,
  filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: number;
    customerId?: number;
    search?: string;
  },
): Promise<TicketWithDetails[]> {
  const customers = await listCustomersByOrg(prisma, organizationId);
  const customerIds = new Set(customers.map((c) => c.id));

  const model = getTicketModel(prisma);
  const allTickets = await model.all();

  const orgTickets = (allTickets || []).filter((t) => {
    if (!customerIds.has(t.customerId)) return false;
    if (filters?.status && t.status !== filters.status) return false;
    if (filters?.priority && t.priority !== filters.priority) return false;
    if (filters?.assignedToId && t.assignedToId !== filters.assignedToId) return false;
    if (filters?.customerId && t.customerId !== filters.customerId) return false;
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      const titleMatch = t.title.toLowerCase().includes(term);
      const descMatch = t.description?.toLowerCase().includes(term);
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  });

  const results: TicketWithDetails[] = [];
  for (const t of orgTickets) {
    const hydrated = await hydrateTicket(prisma, t);
    results.push(hydrated);
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createTicket(
  prisma: PrismaService,
  data: CreateTicketData,
): Promise<TicketWithDetails> {
  const model = getTicketModel(prisma);
  const now = new Date().toISOString();

  const record = await model.create({
    pubId: generatePubId('tkt'),
    customerId: data.customerId,
    conversationId: data.conversationId ?? null,
    title: data.title.trim(),
    description: data.description ?? null,
    status: data.status ?? TicketStatus.OPEN,
    priority: data.priority ?? TicketPriority.MEDIUM,
    assignedToId: data.assignedToId ?? null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  });

  return hydrateTicket(prisma, record);
}

export async function updateTicket(
  prisma: PrismaService,
  id: number,
  data: UpdateTicketData,
): Promise<TicketWithDetails | null> {
  const model = getTicketModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updatePayload['title'] = data.title.trim();
  if (data.description !== undefined) updatePayload['description'] = data.description;
  if (data.status !== undefined) {
    updatePayload['status'] = data.status;
    if (data.status === TicketStatus.RESOLVED || data.status === TicketStatus.CLOSED) {
      updatePayload['resolvedAt'] = data.resolvedAt ?? new Date().toISOString();
    } else {
      updatePayload['resolvedAt'] = null;
    }
  }
  if (data.priority !== undefined) updatePayload['priority'] = data.priority;
  if (data.assignedToId !== undefined) updatePayload['assignedToId'] = data.assignedToId;

  await model.where({ id }).update(updatePayload);
  return findTicketById(prisma, id);
}

export async function deleteTicket(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const model = getTicketModel(prisma);
  await model.where({ id }).delete();
  return true;
}

// ==========================================
// TICKET COMMENT OPERATIONS
// ==========================================

export async function createTicketComment(
  prisma: PrismaService,
  data: CreateTicketCommentData,
): Promise<TicketCommentWithAuthor> {
  const model = getTicketCommentModel(prisma);
  const now = new Date().toISOString();

  const record = await model.create({
    pubId: generatePubId('tcm'),
    ticketId: data.ticketId,
    authorId: data.authorId,
    content: data.content.trim(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  return hydrateComment(prisma, record);
}

export async function findCommentByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<TicketCommentWithAuthor | null> {
  const model = getTicketCommentModel(prisma);
  const record = await model
    .where((c: { pubId: { eq: (val: string) => unknown } }) =>
      c.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record || record.deletedAt) return null;
  return hydrateComment(prisma, record);
}

export async function updateTicketComment(
  prisma: PrismaService,
  id: number,
  content: string,
): Promise<TicketCommentWithAuthor | null> {
  const model = getTicketCommentModel(prisma);
  await model.where({ id }).update({
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  });

  const record = await model.first({ id });
  if (!record || record.deletedAt) return null;
  return hydrateComment(prisma, record);
}

export async function deleteTicketComment(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const model = getTicketCommentModel(prisma);
  // Soft-delete
  await model.where({ id }).update({
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function listCommentsByTicket(
  prisma: PrismaService,
  ticketId: number,
): Promise<TicketCommentWithAuthor[]> {
  const model = getTicketCommentModel(prisma);
  const records = await model
    .where((c: { ticketId: { eq: (val: number) => unknown } }) =>
      c.ticketId.eq(ticketId),
    )
    .all();

  const active = (records || []).filter((r) => !r.deletedAt);
  const results: TicketCommentWithAuthor[] = [];
  for (const item of active) {
    results.push(await hydrateComment(prisma, item));
  }
  return results.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

// ==========================================
// CONVERSATION & MESSAGE OPERATIONS
// ==========================================

export async function createConversation(
  prisma: PrismaService,
  data: CreateConversationData,
): Promise<ConversationWithDetails> {
  const model = getConversationModel(prisma);
  const now = new Date().toISOString();

  const record = await model.create({
    pubId: generatePubId('cnv'),
    customerId: data.customerId,
    title: data.title?.trim() ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (data.participantUserIds?.length) {
    const partModel = getConversationParticipantModel(prisma);
    for (const userId of data.participantUserIds) {
      await partModel.create({
        pubId: generatePubId('prt'),
        conversationId: record.id,
        userId,
        joinedAt: now,
      });
    }
  }

  return hydrateConversation(prisma, record);
}

export async function findConversationById(
  prisma: PrismaService,
  id: number,
): Promise<ConversationWithDetails | null> {
  const model = getConversationModel(prisma);
  const record = await model.first({ id });
  if (!record) return null;
  return hydrateConversation(prisma, record);
}

export async function findConversationByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<ConversationWithDetails | null> {
  const model = getConversationModel(prisma);
  const record = await model
    .where((c: { pubId: { eq: (val: string) => unknown } }) =>
      c.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  return hydrateConversation(prisma, record);
}

export async function listConversationsByCustomer(
  prisma: PrismaService,
  customerId: number,
): Promise<ConversationWithDetails[]> {
  const model = getConversationModel(prisma);
  const records = await model
    .where((c: { customerId: { eq: (val: number) => unknown } }) =>
      c.customerId.eq(customerId),
    )
    .all();

  const results: ConversationWithDetails[] = [];
  for (const c of records || []) {
    results.push(await hydrateConversation(prisma, c));
  }
  return results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function createMessage(
  prisma: PrismaService,
  data: CreateMessageData,
): Promise<MessageWithSender> {
  const model = getMessageModel(prisma);
  const now = new Date().toISOString();

  const record = await model.create({
    pubId: generatePubId('msg'),
    conversationId: data.conversationId,
    senderId: data.senderId ?? null,
    content: data.content.trim(),
    type: data.type ?? MessageType.TEXT,
    metadata: data.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Touch conversation updatedAt
  const convModel = getConversationModel(prisma);
  await convModel.where({ id: data.conversationId }).update({
    updatedAt: now,
  });

  const sender = data.senderId ? await UserHelper.findUserById(prisma, data.senderId) : null;
  return {
    ...record,
    sender,
  };
}

export async function listMessagesByConversation(
  prisma: PrismaService,
  conversationId: number,
): Promise<MessageWithSender[]> {
  const model = getMessageModel(prisma);
  const records = await model
    .where((m: { conversationId: { eq: (val: number) => unknown } }) =>
      m.conversationId.eq(conversationId),
    )
    .all();

  const results: MessageWithSender[] = [];
  for (const m of records || []) {
    const sender = m.senderId ? await UserHelper.findUserById(prisma, m.senderId) : null;
    results.push({
      ...m,
      sender,
    });
  }
  return results.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
