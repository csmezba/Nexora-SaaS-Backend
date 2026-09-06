export interface PrismaUserRecord {
  id: number;
  pubId: string;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SanitizedUser {
  id: number;
  pubId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateUserData {
  passwordHash?: string;
  firstName?: string | null;
  lastName?: string | null;
  refreshTokenHash?: string | null;
}
