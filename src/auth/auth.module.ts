import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserModule } from '../user/user.module.js';
import { AuthResolver } from './auth.resolver.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    JwtModule.register({
      global: false,
    }),
  ],
  providers: [AuthService, AuthResolver, JwtAuthGuard],
  exports: [AuthService, AuthResolver, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
