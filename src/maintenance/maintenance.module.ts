import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { MaintenancePlanEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenancePlanEntity])],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, TenantModuleGuard],
})
export class MaintenanceModule {}
