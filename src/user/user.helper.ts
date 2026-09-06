import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  CreateUserData,
  PrismaUserRecord,
  SanitizedUser,
  UpdateUserData,
} from './types/user.types.js';

export function getUserModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaUserRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaUserRecord>
  >;
  return (
    orm['User'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaUserRecord>>)?.['User'] ||
    orm['user']!
  );
}

export function sanitizeUser(user: PrismaUserRecord): SanitizedUser {
  const firstName = user.firstName ?? null;
  const lastName = user.lastName ?? null;
  const parts = [firstName, lastName].filter(Boolean);
  const fullName = parts.length > 0 ? parts.join(' ') : user.email;

  return {
    id: user.id,
    pubId: user.pubId,
    email: user.email,
    firstName,
    lastName,
    fullName,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export async function findUserById(
  prisma: PrismaService,
  id: number,
): Promise<PrismaUserRecord | null> {
  const userModel = getUserModel(prisma);
  return userModel.first({ id });
}

export async function findUserByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<PrismaUserRecord | null> {
  const userModel = getUserModel(prisma);
  return userModel
    .where((u: { pubId: { eq: (val: string) => unknown } }) =>
      u.pubId.eq(pubId.trim()),
    )
    .first();
}

export async function findUserByEmail(
  prisma: PrismaService,
  email: string,
): Promise<PrismaUserRecord | null> {
  const userModel = getUserModel(prisma);
  return userModel
    .where((u: { email: { eq: (val: string) => unknown } }) =>
      u.email.eq(email.toLowerCase().trim()),
    )
    .first();
}

export async function createUser(
  prisma: PrismaService,
  data: CreateUserData,
): Promise<PrismaUserRecord> {
  const userModel = getUserModel(prisma);
  const now = new Date().toISOString();
  return userModel.create({
    pubId: generatePubId('usr'),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    refreshTokenHash: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateUser(
  prisma: PrismaService,
  id: number,
  data: UpdateUserData,
): Promise<PrismaUserRecord | null> {
  const userModel = getUserModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.passwordHash !== undefined) updatePayload['passwordHash'] = data.passwordHash;
  if (data.firstName !== undefined) updatePayload['firstName'] = data.firstName;
  if (data.lastName !== undefined) updatePayload['lastName'] = data.lastName;
  if (data.refreshTokenHash !== undefined)
    updatePayload['refreshTokenHash'] = data.refreshTokenHash;

  await userModel.where({ id }).update(updatePayload);
  return findUserById(prisma, id);
}

export async function deleteUser(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const userModel = getUserModel(prisma);
  await userModel.where({ id }).delete();
  return true;
}
