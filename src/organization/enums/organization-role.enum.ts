import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  DESIGNER = 'DESIGNER',
  DEVELOPER = 'DEVELOPER',
  QA = 'QA',
  MARKETING = 'MARKETING',
  SALES = 'SALES',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

registerEnumType(OrganizationRole, {
  name: 'OrganizationRole',
  description: 'Role of a member within an organization',
});
