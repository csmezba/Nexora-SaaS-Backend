import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { SanitizedUser } from '../../user/types/user.types.js';

export const CurrentUser = createParamDecorator(
  (data: keyof SanitizedUser | undefined, ctx: ExecutionContext) => {
    let req: { user?: unknown } | undefined;
    if (ctx.getType && (ctx.getType() as string) === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(ctx);
      req = gqlCtx.getContext()?.req;
    } else {
      req = ctx.switchToHttp().getRequest();
    }
    const user = req?.user as SanitizedUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
