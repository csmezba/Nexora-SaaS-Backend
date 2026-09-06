import bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenPair, TokenPayload } from './types/auth.types.js';

const SALT_ROUNDS = 10;

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) {
    throw new Error('Password to hash cannot be empty');
  }
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function comparePassword(
  plainText: string,
  hash: string,
): Promise<boolean> {
  if (!plainText || !hash) {
    return false;
  }
  return bcrypt.compare(plainText, hash);
}

export function getJwtSecrets() {
  return {
    accessSecret:
      process.env['JWT_SECRET'] || 'default-access-secret-key-replace-in-prod',
    refreshSecret:
      process.env['JWT_REFRESH_SECRET'] ||
      'default-refresh-secret-key-replace-in-prod',
    accessExpiresIn: parseInt(process.env['JWT_EXPIRES_IN'] || '3600', 10),
    refreshExpiresIn: parseInt(
      process.env['JWT_REFRESH_EXPIRES_IN'] || '604800',
      10,
    ),
  };
}

export async function generateTokens(
  jwtService: JwtService,
  payload: TokenPayload,
): Promise<TokenPair> {
  const { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn } =
    getJwtSecrets();

  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    }),
    jwtService.signAsync(
      { sub: payload.sub, email: payload.email },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    ),
  ]);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: accessExpiresIn,
  };
}

export async function verifyAccessToken(
  jwtService: JwtService,
  token: string,
): Promise<TokenPayload> {
  try {
    const { accessSecret } = getJwtSecrets();
    return await jwtService.verifyAsync<TokenPayload>(token, {
      secret: accessSecret,
    });
  } catch {
    throw new UnauthorizedException('Invalid or expired access token');
  }
}

export async function verifyRefreshToken(
  jwtService: JwtService,
  token: string,
): Promise<TokenPayload> {
  try {
    const { refreshSecret } = getJwtSecrets();
    return await jwtService.verifyAsync<TokenPayload>(token, {
      secret: refreshSecret,
    });
  } catch {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }
}
