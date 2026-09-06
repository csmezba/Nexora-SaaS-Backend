import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  LoginDto,
  LogoutResponseDto,
  RefreshTokenDto,
  RegisterDto,
  UserResponseDto,
} from './dto/auth.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../user/types/user.types.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResponseDto, {
    description: 'Register a new user account',
  })
  async register(@Args('input') dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Mutation(() => AuthResponseDto, {
    description: 'Authenticate user with email and password',
  })
  async login(@Args('input') dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Mutation(() => AuthResponseDto, {
    description: 'Refresh JWT access token using refresh token',
  })
  async refreshToken(
    @Args('input') dto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Mutation(() => LogoutResponseDto, {
    description: 'Log out user by invalidating session',
  })
  async logout(@CurrentUser('id') userId: number): Promise<LogoutResponseDto> {
    const success = await this.authService.logout(userId);
    return { success };
  }

  @Query(() => UserResponseDto, {
    description: 'Fetch current logged in user profile',
  })
  async me(@CurrentUser() user: SanitizedUser): Promise<UserResponseDto> {
    return user;
  }
}
