import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { RoleModule } from '../role/role.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CrmService } from './crm.service.js';
import { CrmResolver } from './crm.resolver.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    RoleModule,
    RealtimeModule,
  ],
  providers: [CrmService, CrmResolver],
  exports: [CrmService, CrmResolver],
})
export class CrmModule {}
