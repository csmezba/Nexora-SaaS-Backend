import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import * as AuthHelper from '../auth.helper.js';
import * as UserHelper from '../../user/user.helper.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
      const user = await UserHelper.findUserById(this.prisma, payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Attach sanitized user to request
      (request as unknown as { user: unknown }).user =
        UserHelper.sanitizeUser(user);
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
