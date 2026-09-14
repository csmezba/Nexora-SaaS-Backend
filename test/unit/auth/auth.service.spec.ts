import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as UserHelper from '../../../src/user/user.helper.js';
import * as AuthHelper from '../../../src/auth/auth.helper.js';

vi.mock('../../../src/user/user.helper.js', () => ({
  findUserById: vi.fn(),
  findUserByPubId: vi.fn(),
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  sanitizeUser: vi.fn((user) => ({
    id: user.id,
    pubId: user.pubId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  })),
}));

vi.mock('../../../src/auth/auth.helper.js', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  generateTokens: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: PrismaService;
  let mockJwtService: JwtService;

  const mockUserRecord = {
    id: 1,
    pubId: 'usr_123',
    email: 'user@example.com',
    password: '$2a$10$hashedpw',
    firstName: 'John',
    lastName: 'Doe',
    refreshTokenHash: '$2a$10$hashedrefresh',
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {} as unknown as PrismaService;
    mockJwtService = {} as unknown as JwtService;
    authService = new AuthService(mockPrisma, mockJwtService);
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      vi.mocked(UserHelper.findUserByEmail).mockResolvedValue(null);
      vi.mocked(AuthHelper.hashPassword).mockImplementation(
        async (val) => `hashed_${val}`,
      );
      vi.mocked(UserHelper.createUser).mockResolvedValue(mockUserRecord);
      vi.mocked(AuthHelper.generateTokens).mockResolvedValue({
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      vi.mocked(UserHelper.updateUser).mockResolvedValue(mockUserRecord);

      const result = await authService.register({
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.user.email).toBe('user@example.com');
      expect(UserHelper.createUser).toHaveBeenCalledWith(mockPrisma, {
        email: 'user@example.com',
        password: 'hashed_Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw ConflictException if email is already taken', async () => {
      vi.mocked(UserHelper.findUserByEmail).mockResolvedValue(mockUserRecord);

      await expect(
        authService.register({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      vi.mocked(UserHelper.findUserByEmail).mockResolvedValue(mockUserRecord);
      vi.mocked(AuthHelper.comparePassword).mockResolvedValue(true);
      vi.mocked(AuthHelper.hashPassword).mockResolvedValue('hashed_refresh');
      vi.mocked(AuthHelper.generateTokens).mockResolvedValue({
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      vi.mocked(UserHelper.updateUser).mockResolvedValue(mockUserRecord);

      const result = await authService.login({
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.user.id).toBe(1);
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      vi.mocked(UserHelper.findUserByEmail).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      vi.mocked(UserHelper.findUserByEmail).mockResolvedValue(mockUserRecord);
      vi.mocked(AuthHelper.comparePassword).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrowError(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens when valid refresh token is supplied', async () => {
      vi.mocked(AuthHelper.verifyRefreshToken).mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
      });
      vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUserRecord);
      vi.mocked(AuthHelper.comparePassword).mockResolvedValue(true);
      vi.mocked(AuthHelper.hashPassword).mockResolvedValue('new_hash');
      vi.mocked(AuthHelper.generateTokens).mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });

      const result = await authService.refreshToken({
        refreshToken: 'valid.refresh.token',
      });

      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
    });

    it('should reject when refresh token hash does not match stored session', async () => {
      vi.mocked(AuthHelper.verifyRefreshToken).mockResolvedValue({
        sub: 1,
        email: 'user@example.com',
      });
      vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUserRecord);
      vi.mocked(AuthHelper.comparePassword).mockResolvedValue(false);

      await expect(
        authService.refreshToken({
          refreshToken: 'revoked.refresh.token',
        }),
      ).rejects.toThrowError('Refresh token has been revoked or invalidated');
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash on logout', async () => {
      vi.mocked(UserHelper.updateUser).mockResolvedValue(mockUserRecord);

      const result = await authService.logout(1);
      expect(result).toBe(true);
      expect(UserHelper.updateUser).toHaveBeenCalledWith(mockPrisma, 1, {
        refreshTokenHash: null,
      });
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      vi.mocked(UserHelper.findUserById).mockResolvedValue(mockUserRecord);

      const profile = await authService.getProfile(1);
      expect(profile.id).toBe(1);
      expect(profile.email).toBe('user@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      vi.mocked(UserHelper.findUserById).mockResolvedValue(null);

      await expect(authService.getProfile(99)).rejects.toThrowError(
        NotFoundException,
      );
    });
  });
});
