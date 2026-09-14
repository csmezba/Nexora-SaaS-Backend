import { registerEnumType } from '@nestjs/graphql';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}

registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'Payload type of a conversation message',
});
