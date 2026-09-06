import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../enums/organization-role.enum.js';

export const ORG_ROLES_KEY = 'org_roles';
export const RequireOrgRole = (...roles: OrganizationRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);
