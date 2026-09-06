import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { RoleService } from './role.service.js';
import { RoleResolver } from './role.resolver.js';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, OrganizationModule],
  providers: [RoleService, RoleResolver],
  exports: [RoleService, RoleResolver],
})
export class RoleModule {}
