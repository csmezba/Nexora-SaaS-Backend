import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ORG_ROLES_KEY } from '../decorators/require-org-role.decorator.js';
import { OrganizationRole } from '../enums/organization-role.enum.js';
import * as OrgHelper from '../organization.helper.js';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext<{ req: { user?: { id: number } } }>();
    const args = gqlContext.getArgs<{
      organizationPubId?: string;
      pubId?: string;
      organizationId?: string;
      id?: string;
      input?: { organizationId?: string; organizationPubId?: string };
    }>();

    const userId = req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated');
    }

    const rawOrgId =
      args.organizationPubId ??
      args.pubId ??
      args.organizationId ??
      args.id ??
      args.input?.organizationId;
    if (!rawOrgId) {
      return true;
    }

    const org = await OrgHelper.findByPubIdOrSlug(this.prisma, String(rawOrgId));
    if (!org) {
      throw new NotFoundException(`Organization '${rawOrgId}' not found`);
    }

    const member = await OrgHelper.findByOrgAndUser(
      this.prisma,
      org.id,
      userId,
    );
    if (!member) {
      throw new NotFoundException('You are not a member of this organization');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}. Your role: ${member.role}`,
      );
    }

    return true;
  }
}
