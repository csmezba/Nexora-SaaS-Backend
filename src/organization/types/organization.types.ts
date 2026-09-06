import { OrganizationRole } from '../enums/organization-role.enum.js';

export interface PrismaOrganizationRecord {
  id: number;
  pubId: string;
  name?: string | null;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PrismaMemberRecord {
  id: number;
  pubId: string;
  organizationId: number;
  userId: number;
  role: OrganizationRole;
  joinedAt: string | Date;
}

export interface PrismaOrmModel<T> {
  first(filter?: Record<string, unknown>): Promise<T | null>;
  where(predicate: unknown): {
    first(): Promise<T | null>;
    all(): Promise<T[]> & AsyncIterable<T>;
    update(data: Record<string, unknown>): Promise<unknown>;
    delete(): Promise<unknown>;
  };
  create(data: Record<string, unknown>): Promise<T>;
  all(): Promise<T[]> & AsyncIterable<T>;
}
