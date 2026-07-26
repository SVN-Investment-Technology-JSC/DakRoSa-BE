import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrganizationUnitEntity,
  PermissionEntity,
  PositionEntity,
  RoleEntity,
  SiteEntity,
  TenantEntity,
  TenantMembershipEntity,
} from '../database/entities';
import { AuditModule } from '../audit/audit.module';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { PlatformTenancyController } from './platform-tenancy.controller';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      SiteEntity,
      OrganizationUnitEntity,
      PositionEntity,
      TenantMembershipEntity,
      RoleEntity,
      PermissionEntity,
    ]),
    AuditModule,
  ],
  controllers: [TenancyController, PlatformTenancyController],
  providers: [TenancyService, PlatformAdminGuard, TenantModuleGuard],
  exports: [TenancyService],
})
export class TenancyModule {}
