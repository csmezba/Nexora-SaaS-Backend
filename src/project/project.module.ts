import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { TeamModule } from '../team/team.module.js';
import { RoleModule } from '../role/role.module.js';
import { ProjectService } from './project.service.js';
import { ProjectResolver } from './project.resolver.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    TeamModule,
    RoleModule,
  ],
  providers: [ProjectService, ProjectResolver],
  exports: [ProjectService, ProjectResolver],
})
export class ProjectModule {}
