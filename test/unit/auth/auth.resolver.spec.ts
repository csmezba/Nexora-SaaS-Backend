import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthResolver } from '../../../src/auth/auth.resolver.js';
import { AuthService } from '../../../src/auth/auth.service.js';
import type { SanitizedUser } from '../../../src/user/types/user.types.js';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let mockAuthService: AuthService;

  const mockSanitizedUser: SanitizedUser = {
    id: 1,
    email: 'admin@nexora.ai',
    firstName: 'Admin',
    lastName: 'User',
    fullName: 'Admin User',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockAuthResponse = {
    user: mockSanitizedUser,
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    tokenType: 'Bearer' as const,
    expiresIn: 3600,
  };

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getProfile: vi.fn(),
    } as unknown as AuthService;

    resolver = new AuthResolver(mockAuthService);
  });

  it('should delegate register mutation to authService', async () => {
    vi.mocked(mockAuthService.register).mockResolvedValue(mockAuthResponse);

    const dto = { email: 'admin@nexora.ai', password: 'Password123!' };
    const result = await resolver.register(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should delegate login mutation to authService', async () => {
    vi.mocked(mockAuthService.login).mockResolvedValue(mockAuthResponse);

    const dto = { email: 'admin@nexora.ai', password: 'Password123!' };
    const result = await resolver.login(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate refresh token mutation to authService', async () => {
    vi.mocked(mockAuthService.refreshToken).mockResolvedValue(mockAuthResponse);

    const dto = { refreshToken: 'mock.refresh.token' };
    const result = await resolver.refreshToken(dto);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto);
  });

  it('should delegate logout mutation to authService', async () => {
    vi.mocked(mockAuthService.logout).mockResolvedValue(true);

    const result = await resolver.logout(1);
    expect(result).toEqual({ success: true });
    expect(mockAuthService.logout).toHaveBeenCalledWith(1);
  });

  it('should return user for me query', async () => {
    const profile = await resolver.me(mockSanitizedUser);
    expect(profile).toEqual(mockSanitizedUser);
  });
});
