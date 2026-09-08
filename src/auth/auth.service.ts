import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import * as UserHelper from '../user/user.helper.js';
import * as AuthHelper from './auth.helper.js';
import type { TokenPayload } from './types/auth.types.js';
import type { SanitizedUser } from '../user/types/user.types.js';
import type {
  AuthResponseDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const existing = await UserHelper.findUserByEmail(this.prisma, dto.email);
      if (existing) {
        throw new ConflictException(
          `User with email "${dto.email}" already exists`,
        );
      }

      const password = await AuthHelper.hashPassword(dto.password);
      const user = await UserHelper.createUser(this.prisma, {
        email: dto.email,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await AuthHelper.generateTokens(
        this.jwtService,
        tokenPayload,
      );
      const refreshTokenHash = await AuthHelper.hashPassword(
        tokens.refreshToken,
      );
      await UserHelper.updateUser(this.prisma, user.id, { refreshTokenHash });

      return {
        user: UserHelper.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in register: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred during registration',
      );
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    try {
      const user = await UserHelper.findUserByEmail(this.prisma, dto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const storedPassword = user.password || user.passwordHash || '';
      const isPasswordValid = await AuthHelper.comparePassword(
        dto.password,
        storedPassword,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await AuthHelper.generateTokens(
        this.jwtService,
        tokenPayload,
      );
      const refreshTokenHash = await AuthHelper.hashPassword(
        tokens.refreshToken,
      );
      await UserHelper.updateUser(this.prisma, user.id, { refreshTokenHash });

      return {
        user: UserHelper.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in login: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred during login',
      );
    }
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      const payload = await AuthHelper.verifyRefreshToken(
        this.jwtService,
        dto.refreshToken,
      );
      const user = await UserHelper.findUserById(this.prisma, payload.sub);

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token session');
      }

      const isRefreshMatch = await AuthHelper.comparePassword(
        dto.refreshToken,
        user.refreshTokenHash,
      );

      if (!isRefreshMatch) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or invalidated',
        );
      }

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
      };

      const tokens = await AuthHelper.generateTokens(
        this.jwtService,
        tokenPayload,
      );
      const newRefreshTokenHash = await AuthHelper.hashPassword(
        tokens.refreshToken,
      );
      await UserHelper.updateUser(this.prisma, user.id, {
        refreshTokenHash: newRefreshTokenHash,
      });

      return {
        user: UserHelper.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in refreshToken: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred during token refresh',
      );
    }
  }

  async logout(userId: number): Promise<boolean> {
    try {
      await UserHelper.updateUser(this.prisma, userId, {
        refreshTokenHash: null,
      });
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in logout: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred during logout',
      );
    }
  }

  async getProfile(userId: number): Promise<SanitizedUser> {
    try {
      const user = await UserHelper.findUserById(this.prisma, userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      return UserHelper.sanitizeUser(user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error in getProfile: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'An error occurred while fetching user profile',
      );
    }
  }
}
