import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import * as AuthHelper from '../auth.helper.js';
import * as UserHelper from '../../user/user.helper.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = this.getRequest(context);
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = await AuthHelper.verifyAccessToken(
        this.jwtService,
        token,
      );

      const cacheKey = `user:session:${payload.sub}`;
      let sanitizedUser: ReturnType<typeof UserHelper.sanitizeUser> | null =
        null;

      if (this.redisService) {
        sanitizedUser = await this.redisService.get(cacheKey);
      }

      if (!sanitizedUser) {
        const user = await UserHelper.findUserById(this.prisma, payload.sub);

        if (!user) {
          throw new UnauthorizedException('User no longer exists');
        }

        sanitizedUser = UserHelper.sanitizeUser(user);

        if (this.redisService) {
          // Cache session profile for 10 minutes (600s)
          await this.redisService.set(cacheKey, sanitizedUser, 600);
        }
      }

      // Attach sanitized user to request
      (request as unknown as { user: unknown }).user = sanitizedUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  private getRequest(context: ExecutionContext): Request {
    if (context.getType && (context.getType() as string) === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext()?.req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request?.headers?.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
