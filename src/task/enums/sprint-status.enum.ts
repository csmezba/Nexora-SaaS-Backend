import { registerEnumType } from '@nestjs/graphql';

export enum SprintStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

registerEnumType(SprintStatus, {
  name: 'SprintStatus',
  description: 'Lifecycle status of a sprint',
});
