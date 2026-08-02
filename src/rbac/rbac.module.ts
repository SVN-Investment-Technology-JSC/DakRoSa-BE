import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import {
  PermissionEntity,
  RoleEntity,
  TenantMembershipEntity,
} from '../database/entities';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      TenantMembershipEntity,
    ]),
    AuditModule,
  ],
  controllers: [RbacController],
  providers: [RbacService, TenantModuleGuard],
})
export class RbacModule {}
