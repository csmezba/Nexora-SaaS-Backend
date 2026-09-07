import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { TeamModule } from '../team/team.module.js';
import { ProjectModule } from '../project/project.module.js';
import { RoleModule } from '../role/role.module.js';
import { TaskService } from './task.service.js';
import { TaskResolver } from './task.resolver.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    TeamModule,
    ProjectModule,
    RoleModule,
  ],
  providers: [TaskService, TaskResolver],
  exports: [TaskService, TaskResolver],
})
export class TaskModule {}
