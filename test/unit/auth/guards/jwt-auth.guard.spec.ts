import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../../../../src/prisma/prisma.service.js';
import * as AuthHelper from '../../../../src/auth/auth.helper.js';
import * as UserHelper from '../../../../src/user/user.helper.js';

vi.mock('../../../../src/auth/auth.helper.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../../../src/user/user.helper.js', () => ({
  findUserById: vi.fn(),
  sanitizeUser: vi.fn((u) => ({
    id: u.id,
    pubId: u.pubId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  })),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: Reflector;
  let mockJwtService: JwtService;
  let mockPrisma: PrismaService;

  const mockUserRecord = {
    id: 1,
    pubId: 'usr_123',
    email: 'user@nexora.ai',
    passwordHash: 'hash',
    firstName: 'Alice',
    lastName: 'Smith',
    refreshTokenHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;
    mockJwtService = {} as unknown as JwtService;
    mockPrisma = {} as unknown as PrismaService;

    guard = new JwtAuthGuard(mockReflector, mockJwtService, mockPrisma);
  });

  const createMockContext = (
    authHeader?: string,
  ): { context: ExecutionContext; req: Record<string, unknown> } => {
    const req: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  };

  it('should allow access immediately if route is marked as Public', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(true);
    const { context } = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
    const { context } = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrowError(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should authenticate valid token and attach sanitized user to request', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
    const { context, req } = createMockContext('Bearer valid-jwt-token');

    vi.mocked(AuthHelper.verifyAccessToken).mockResolvedValue({
      sub: 1,
      email: 'user@nexora.ai',
    });

    vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUserRecord);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req['user']).toEqual(UserHelper.sanitizeUser(mockUserRecord));
  });

  it('should reject if user no longer exists', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
    const { context } = createMockContext('Bearer valid-jwt-token');

    vi.mocked(AuthHelper.verifyAccessToken).mockResolvedValue({
      sub: 999,
      email: 'none@nexora.ai',
    });
    vi.mocked(UserHelper.findUserById).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrowError(
      'User no longer exists',
    );
  });

  it('should reject if token verification fails', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
    const { context } = createMockContext('Bearer bad-token');

    vi.mocked(AuthHelper.verifyAccessToken).mockRejectedValue(
      new Error('Invalid signature'),
    );

    await expect(guard.canActivate(context)).rejects.toThrowError(
      'Invalid or expired authentication token',
    );
  });

  it('should authenticate correctly with GraphQL execution context', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);

    const req: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer gql-token',
      },
    };

    const gqlContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getType: () => 'graphql',
      getArgs: () => [{}, {}, { req }, {}],
      getArgByIndex: (index: number) => (index === 2 ? { req } : {}),
    } as unknown as ExecutionContext;

    vi.mocked(AuthHelper.verifyAccessToken).mockResolvedValue({
      sub: 1,
      email: 'gql@nexora.ai',
    });

    vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUserRecord);

    const result = await guard.canActivate(gqlContext);
    expect(result).toBe(true);
  });
});
