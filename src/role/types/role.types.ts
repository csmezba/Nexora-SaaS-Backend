export interface PrismaRoleRecord {
  id: number;
  pubId: string;
  name: string;
  description?: string | null;
  organizationId: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaPermissionRecord {
  id: number;
  pubId: string;
  resource: string;
  action: string;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaRolePermissionRecord {
  pubId: string;
  roleId: number;
  permissionId: number;
  assignedAt: string | Date;
}

export interface PrismaMemberRoleRecord {
  pubId: string;
  organizationMemberId: number;
  roleId: number;
  assignedAt: string | Date;
}

export interface CreateRoleData {
  name: string;
  description?: string | null;
  organizationId: number;
  pubId?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
}

export interface CreatePermissionData {
  resource: string;
  action: string;
  description?: string | null;
  pubId?: string;
}

export interface UpdatePermissionData {
  resource?: string;
  action?: string;
  description?: string | null;
}
