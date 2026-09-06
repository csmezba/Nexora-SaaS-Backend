import {
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as UserHelper from '../user/user.helper.js';
import type { PrismaUserRecord } from '../user/types/user.types.js';
import type {
  PrismaMemberRecord,
  PrismaOrganizationRecord,
  PrismaOrmModel,
} from './types/organization.types.js';

const logger = new Logger('OrganizationHelper');

export function getOrgModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaOrganizationRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaOrganizationRecord>
  >;
  return (
    orm['Organization'] ||
    (
      orm['public'] as unknown as Record<
        string,
        PrismaOrmModel<PrismaOrganizationRecord>
      >
    )?.['Organization'] ||
    orm['organization']!
  );
}

export function getMemberModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaMemberRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaMemberRecord>
  >;
  return (
    orm['OrganizationMember'] ||
    (
      orm['public'] as unknown as Record<
        string,
        PrismaOrmModel<PrismaMemberRecord>
      >
    )?.['OrganizationMember'] ||
    orm['organizationMember']!
  );
}

export async function findByPubIdOrSlug(
  prisma: PrismaService,
  identifier: string,
): Promise<PrismaOrganizationRecord | null> {
  const orgModel = getOrgModel(prisma);
  const trimmed = identifier.trim();
  if (trimmed.startsWith('org_')) {
    const byPubId = await orgModel
      .where((o: { pubId: { eq: (val: string) => unknown } }) =>
        o.pubId.eq(trimmed),
      )
      .first();
    if (byPubId) return byPubId;
  }

  const bySlug = await orgModel
    .where((o: { slug: { eq: (val: string) => unknown } }) =>
      o.slug.eq(trimmed.toLowerCase()),
    )
    .first();
  if (bySlug) return bySlug;

  return orgModel
    .where((o: { pubId: { eq: (val: string) => unknown } }) =>
      o.pubId.eq(trimmed),
    )
    .first();
}

export async function findByOrgAndUser(
  prisma: PrismaService,
  organizationId: number,
  userId: number,
): Promise<PrismaMemberRecord | null> {
  const memberModel = getMemberModel(prisma);
  const records = await memberModel
    .where(
      (m: {
        organizationId: { eq: (val: number) => unknown };
        userId: { eq: (val: number) => unknown };
      }) => m.organizationId.eq(organizationId),
    )
    .all();

  return (
    (records || []).find(
      (m) => m.organizationId === organizationId && m.userId === userId,
    ) ?? null
  );
}

export async function findMemberByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<PrismaMemberRecord | null> {
  const memberModel = getMemberModel(prisma);
  return memberModel
    .where((m: { pubId: { eq: (val: string) => unknown } }) =>
      m.pubId.eq(pubId.trim()),
    )
    .first();
}

export async function countMembers(
  prisma: PrismaService,
  organizationId: number,
): Promise<number> {
  const memberModel = getMemberModel(prisma);
  const records = await memberModel
    .where(
      (m: { organizationId: { eq: (val: number) => unknown } }) =>
        m.organizationId.eq(organizationId),
    )
    .all();
  return (records || []).length;
}

export async function resolveOrganization(
  prisma: PrismaService,
  identifier: string,
): Promise<PrismaOrganizationRecord> {
  try {
    const org = await findByPubIdOrSlug(prisma, identifier);
    if (!org) {
      throw new NotFoundException(`Organization '${identifier}' not found`);
    }
    return org;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    logger.error(
      `Error in resolveOrganization: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new InternalServerErrorException(
      error instanceof Error
        ? error.message
        : 'An error occurred while resolving organization',
    );
  }
}

export async function resolveUser(
  prisma: PrismaService,
  identifier: string,
): Promise<PrismaUserRecord> {
  try {
    const str = identifier.trim();
    if (str.includes('@')) {
      const user = await UserHelper.findUserByEmail(prisma, str);
      if (user) return user;
    }
    if (str.startsWith('usr_')) {
      const user = await UserHelper.findUserByPubId(prisma, str);
      if (user) return user;
    }
    const userByPubId = await UserHelper.findUserByPubId(prisma, str);
    if (userByPubId) return userByPubId;

    const userByEmail = await UserHelper.findUserByEmail(prisma, str);
    if (userByEmail) return userByEmail;

    throw new NotFoundException(`User '${identifier}' not found`);
  } catch (error) {
    if (error instanceof HttpException) throw error;
    logger.error(
      `Error in resolveUser: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new InternalServerErrorException(
      error instanceof Error
        ? error.message
        : 'An error occurred while resolving user',
    );
  }
}
