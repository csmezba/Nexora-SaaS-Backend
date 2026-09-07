import { registerEnumType } from '@nestjs/graphql';

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Lifecycle status of a task',
});
