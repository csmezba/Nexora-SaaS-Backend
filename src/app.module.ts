import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { RoleModule } from './role/role.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { ResponseFormatPlugin } from './common/plugins/response-format.plugin.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';
import { ResponseTransformMiddleware } from './common/middlewares/response-transform.middleware.js';
import { ObserveModule } from './observe.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile:
        process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
          ? true
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      formatError: (formattedError, error: any) => {
        const originalError = error?.extensions?.originalError || error;
        let statusCode =
          error?.extensions?.statusCode ??
          error?.extensions?.statuscode ??
          originalError?.statusCode ??
          originalError?.status ??
          500;
        let errorMsg = formattedError.message;

        if (Array.isArray(originalError?.message)) {
          errorMsg = originalError.message.join(', ');
        } else if (typeof originalError?.message === 'string') {
          errorMsg = originalError.message;
        } else if (typeof originalError?.error === 'string') {
          errorMsg = originalError.error;
        }

        return {
          message: errorMsg,
          success: false,
          statusCode,
          error: errorMsg,
        } as any;
      },
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    OrganizationModule,
    RoleModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY || '',
      appSecret: process.env.OBSERVE_APP_SECRET || '',
      serviceId: process.env.OBSERVE_SERVICE_ID || 'nexora-api',
      serviceVersion: process.env.OBSERVE_SERVICE_VERSION || '0.0.1',
      ...(process.env.OBSERVE_ENDPOINT ? { endpoint: process.env.OBSERVE_ENDPOINT } : {}),
      http: {
        getUserId: (req: any) => req?.user?.id,
      },
      graphql: {
        getUserId: (context: any) => context?.req?.user?.id,
      },
    }),
  ],
  controllers: [],
  providers: [
    ResponseFormatPlugin,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ResponseTransformMiddleware).forRoutes('*');
  }
}
