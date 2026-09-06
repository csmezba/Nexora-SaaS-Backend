import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { RoleModule } from '../role/role.module.js';
import { TeamService } from './team.service.js';
import { TeamResolver } from './team.resolver.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    RoleModule,
  ],
  providers: [TeamService, TeamResolver],
  exports: [TeamService, TeamResolver],
})
export class TeamModule {}
