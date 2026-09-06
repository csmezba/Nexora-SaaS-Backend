import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationService } from './organization.service.js';
import { OrganizationResolver } from './organization.resolver.js';
import { OrganizationRoleGuard } from './guards/organization-role.guard.js';

@Module({
  imports: [PrismaModule, AuthModule, UserModule],
  providers: [
    OrganizationService,
    OrganizationResolver,
    OrganizationRoleGuard,
  ],
  exports: [OrganizationService, OrganizationRoleGuard],
})
export class OrganizationModule {}
