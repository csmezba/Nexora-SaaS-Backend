import { generatePubId } from '../../common/utils/unique-id.util.js';
import { TicketStatus } from '../../crm/enums/ticket-status.enum.js';
import { TicketPriority } from '../../crm/enums/ticket-priority.enum.js';
import { MessageType } from '../../crm/enums/message-type.enum.js';
import { getOrmModel, logger } from './common.js';
import { seedOrganizations } from './organization.seed.js';
import { seedUsers } from './user.seed.js';

export interface SeedCustomerDefinition {
  orgSlug: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface SeedTicketDefinition {
  orgSlug: string;
  customerEmail: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToEmail?: string;
  comments?: { authorEmail: string; content: string }[];
}

export interface SeedConversationDefinition {
  orgSlug: string;
  customerEmail: string;
  title: string;
  participantEmails: string[];
  messages: {
    senderEmail?: string; // If undefined, message from customer
    content: string;
    type?: MessageType;
  }[];
}

export const SEED_CUSTOMERS: SeedCustomerDefinition[] = [
  // --- Nexora Labs Customers ---
  {
    orgSlug: 'nexora-labs',
    name: 'TechCorp Enterprise',
    email: 'contact@techcorp.io',
    phone: '+1 (555) 234-5678',
    company: 'TechCorp Global Solutions',
  },
  {
    orgSlug: 'nexora-labs',
    name: 'Vertex Innovations',
    email: 'billing@vertexinnovations.com',
    phone: '+1 (555) 876-5432',
    company: 'Vertex Innovations LLC',
  },
  {
    orgSlug: 'nexora-labs',
    name: 'Quantum Data Labs',
    email: 'ops@quantumdata.ai',
    phone: '+1 (555) 345-6789',
    company: 'Quantum Data Technologies',
  },

  // --- Acme Corp Customers ---
  {
    orgSlug: 'acme-corp',
    name: 'Starlight Retail',
    email: 'support@starlightretail.com',
    phone: '+1 (555) 987-6543',
    company: 'Starlight E-Commerce',
  },
  {
    orgSlug: 'acme-corp',
    name: 'Apex Logistics',
    email: 'dispatch@apexlogistics.com',
    phone: '+1 (555) 432-1098',
    company: 'Apex Supply Chain',
  },
];

export const SEED_TICKETS: SeedTicketDefinition[] = [
  // --- Nexora Labs Tickets ---
  {
    orgSlug: 'nexora-labs',
    customerEmail: 'contact@techcorp.io',
    title: 'SSO SAML authentication failing for enterprise workspace',
    description:
      'Users report an invalid certificate error when logging in via Okta SAML 2.0 integration.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.URGENT,
    assignedToEmail: 'lead.dev@nexora.app',
    comments: [
      {
        authorEmail: 'lead.dev@nexora.app',
        content: 'Investigating the metadata URL response and certificate expiration dates.',
      },
      {
        authorEmail: 'admin@nexora.app',
        content: 'Customer is on the Enterprise tier. High priority SLA is 2 hours.',
      },
    ],
  },
  {
    orgSlug: 'nexora-labs',
    customerEmail: 'billing@vertexinnovations.com',
    title: 'Update billing address and tax ID on latest invoice',
    description:
      'We recently moved our European office and need our VAT number updated on invoice #INV-2026-004.',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.MEDIUM,
    assignedToEmail: 'admin@nexora.app',
    comments: [
      {
        authorEmail: 'admin@nexora.app',
        content: 'Requested updated tax residency certificate from their accounting team.',
      },
    ],
  },
  {
    orgSlug: 'nexora-labs',
    customerEmail: 'ops@quantumdata.ai',
    title: 'API rate limits hitting 429 during nightly data ingestion',
    description:
      'Our ETL pipeline runs between 2 AM - 4 AM UTC and triggers 429 Too Many Requests on batch endpoints.',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.HIGH,
    assignedToEmail: 'dev@nexora.app',
    comments: [
      {
        authorEmail: 'dev@nexora.app',
        content: 'Temporary burst quota increased from 500 req/min to 2,000 req/min during nightly windows.',
      },
      {
        authorEmail: 'qa@nexora.app',
        content: 'Verified no 429 errors observed during the last two batch runs.',
      },
    ],
  },

  // --- Acme Corp Tickets ---
  {
    orgSlug: 'acme-corp',
    customerEmail: 'support@starlightretail.com',
    title: 'Webhook delivery failures on order dispatch events',
    description:
      'Webhook listener returned 502 Bad Gateway intermittently over the last 24 hours.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    assignedToEmail: 'admin@nexora.app',
    comments: [
      {
        authorEmail: 'admin@nexora.app',
        content: 'Checking webhook retry logs and payload signature verifications.',
      },
    ],
  },
  {
    orgSlug: 'acme-corp',
    customerEmail: 'dispatch@apexlogistics.com',
    title: 'Request for CSV export format customization',
    description:
      'Need additional columns (weight, customs code) added to standard dispatch manifest export.',
    status: TicketStatus.CLOSED,
    priority: TicketPriority.LOW,
    assignedToEmail: 'dev@nexora.app',
    comments: [
      {
        authorEmail: 'dev@nexora.app',
        content: 'Custom export template enabled in workspace settings. Customer confirmed functionality.',
      },
    ],
  },
];

export const SEED_CONVERSATIONS: SeedConversationDefinition[] = [
  {
    orgSlug: 'nexora-labs',
    customerEmail: 'contact@techcorp.io',
    title: 'Onboarding & Enterprise SSO Setup Assistance',
    participantEmails: ['lead.dev@nexora.app', 'admin@nexora.app'],
    messages: [
      {
        content: 'Hi Nexora Support, we are starting our Okta configuration today.',
        type: MessageType.TEXT,
      },
      {
        senderEmail: 'lead.dev@nexora.app',
        content:
          'Welcome TechCorp team! Please share your IdP metadata XML or URL so we can test the handshake.',
        type: MessageType.TEXT,
      },
      {
        content: 'We uploaded the metadata file to our secure drive. Link shared with Marcus.',
        type: MessageType.TEXT,
      },
      {
        senderEmail: 'lead.dev@nexora.app',
        content:
          'Got it! Reviewing the assertion consumer service URL right now. Looking good so far.',
        type: MessageType.TEXT,
      },
    ],
  },
];

export async function seedCrm() {
  logger.info('Starting CRM & Support seeding...');

  // 1. Ensure Dependencies
  const [usersResult, orgsResult] = await Promise.all([
    seedUsers(),
    seedOrganizations(),
  ]);

  const orgs = (orgsResult as any).organizations || orgsResult;
  const orgList = Array.isArray(orgs) ? orgs : [];
  const orgMap = new Map<string, any>(
    orgList.map((o: any) => [o.slug?.toLowerCase().trim(), o]),
  );

  const users = Array.isArray(usersResult)
    ? usersResult
    : (usersResult as any).users || [];
  const userMap = new Map<string, any>(
    users.map((u: any) => [u.email?.toLowerCase().trim(), u]),
  );

  const customerModel = getOrmModel('Customer');
  const ticketModel = getOrmModel('Ticket');
  const ticketCommentModel = getOrmModel('TicketComment');
  const conversationModel = getOrmModel('Conversation');
  const participantModel = getOrmModel('ConversationParticipant');
  const messageModel = getOrmModel('Message');

  // 2. Seed Customers
  const existingCustomers = (await customerModel.all()) || [];
  const seededCustomers: any[] = [];

  for (const def of SEED_CUSTOMERS) {
    const org = orgMap.get(def.orgSlug.toLowerCase().trim());
    if (!org) continue;

    let customer = existingCustomers.find(
      (c: any) =>
        c.organizationId === org.id &&
        c.email &&
        c.email.toLowerCase() === def.email.toLowerCase(),
    );

    if (!customer) {
      const now = new Date().toISOString();
      customer = await customerModel.create({
        pubId: generatePubId('cus'),
        organizationId: org.id,
        name: def.name,
        email: def.email,
        phone: def.phone ?? null,
        company: def.company ?? null,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });
      logger.success(`Created customer: "${def.name}" (${def.email})`);
    }

    seededCustomers.push(customer);
  }

  const customerMap = new Map(
    seededCustomers.map((c) => [`${c.organizationId}:${c.email.toLowerCase()}`, c]),
  );

  // 3. Seed Tickets & Comments
  const existingTickets = (await ticketModel.all()) || [];
  const seededTickets: any[] = [];
  let commentsCount = 0;

  for (const def of SEED_TICKETS) {
    const org = orgMap.get(def.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const customer = customerMap.get(`${org.id}:${def.customerEmail.toLowerCase()}`);
    if (!customer) continue;

    let ticket = existingTickets.find(
      (t: any) => t.customerId === customer.id && t.title === def.title,
    );

    if (!ticket) {
      const now = new Date().toISOString();
      let assignedToId: number | null = null;
      if (def.assignedToEmail) {
        const u = userMap.get(def.assignedToEmail.toLowerCase().trim());
        if (u) assignedToId = u.id;
      }

      ticket = await ticketModel.create({
        pubId: generatePubId('tkt'),
        customerId: customer.id,
        conversationId: null,
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        assignedToId,
        createdAt: now,
        updatedAt: now,
        resolvedAt:
          def.status === TicketStatus.RESOLVED || def.status === TicketStatus.CLOSED
            ? now
            : null,
      });
      logger.success(`Created ticket: "${def.title}" [${def.status}]`);
    }

    seededTickets.push(ticket);

    // Comments
    if (def.comments?.length) {
      const existingComments = (await ticketCommentModel.all()) || [];
      for (const cDef of def.comments) {
        const author = userMap.get(cDef.authorEmail.toLowerCase().trim());
        if (!author) continue;

        const alreadyExists = existingComments.some(
          (c: any) =>
            c.ticketId === ticket.id &&
            c.authorId === author.id &&
            c.content === cDef.content,
        );

        if (!alreadyExists) {
          const now = new Date().toISOString();
          await ticketCommentModel.create({
            pubId: generatePubId('tcm'),
            ticketId: ticket.id,
            authorId: author.id,
            content: cDef.content,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
          commentsCount++;
        }
      }
    }
  }

  // 4. Seed Conversations & Messages
  const existingConversations = (await conversationModel.all()) || [];
  const seededConversations: any[] = [];
  let messagesCount = 0;

  for (const def of SEED_CONVERSATIONS) {
    const org = orgMap.get(def.orgSlug.toLowerCase().trim());
    if (!org) continue;

    const customer = customerMap.get(`${org.id}:${def.customerEmail.toLowerCase()}`);
    if (!customer) continue;

    let conv = existingConversations.find(
      (c: any) => c.customerId === customer.id && c.title === def.title,
    );

    if (!conv) {
      const now = new Date().toISOString();
      conv = await conversationModel.create({
        pubId: generatePubId('cnv'),
        customerId: customer.id,
        title: def.title,
        createdAt: now,
        updatedAt: now,
      });

      // Participants
      for (const email of def.participantEmails) {
        const u = userMap.get(email.toLowerCase().trim());
        if (u) {
          await participantModel.create({
            pubId: generatePubId('prt'),
            conversationId: conv.id,
            userId: u.id,
            joinedAt: now,
          });
        }
      }

      // Messages
      for (const mDef of def.messages) {
        let senderId: number | null = null;
        if (mDef.senderEmail) {
          const sender = userMap.get(mDef.senderEmail.toLowerCase().trim());
          if (sender) senderId = sender.id;
        }

        await messageModel.create({
          pubId: generatePubId('msg'),
          conversationId: conv.id,
          senderId,
          content: mDef.content,
          type: mDef.type ?? MessageType.TEXT,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        });
        messagesCount++;
      }

      logger.success(`Created conversation: "${def.title}" with ${def.messages.length} messages`);
    }

    seededConversations.push(conv);
  }

  logger.success(
    `CRM seeding complete. Customers: ${seededCustomers.length}, Tickets: ${seededTickets.length}, Comments: ${commentsCount}, Conversations: ${seededConversations.length}, Messages: ${messagesCount}`,
  );

  return {
    customers: seededCustomers,
    tickets: seededTickets,
    conversations: seededConversations,
  };
}
