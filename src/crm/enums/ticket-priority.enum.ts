import { registerEnumType } from '@nestjs/graphql';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

registerEnumType(TicketPriority, {
  name: 'TicketPriority',
  description: 'Priority level of a customer support ticket',
});
