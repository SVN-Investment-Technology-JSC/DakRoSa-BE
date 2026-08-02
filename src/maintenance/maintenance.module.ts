import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { MaintenancePlanEntity } from '../database/entities';
import {
  EquipmentEntity,
  EquipmentGroupEntity,
  EquipmentGroupMemberEntity,
  EquipmentMeterEntity,
  EquipmentMeterReadingEntity,
  MaintenanceJobPlanEntity,
  MaintenanceJobPlanStepEntity,
  MaintenanceJobPlanVersionEntity,
  MaintenanceOccurrenceEntity,
  MaintenanceScheduleEntity,
  MaintenanceScheduleTargetEntity,
  MaintenanceTriggerEntity,
  SiteEntity,
  TenantEntity,
  WorkflowDefinitionEntity,
  NotificationEntity,
  WorkOrderEntity,
} from '../database/entities';
import { MaintenancePlatformController } from './maintenance-platform.controller';
import { MaintenanceJobPlanService } from './maintenance-job-plan.service';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';
import { EquipmentMeterService } from './equipment-meter.service';
import { MaintenanceOccurrenceScheduler } from './maintenance-occurrence.scheduler';
import { MaintenanceReminderScheduler } from './maintenance-reminder.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenancePlanEntity,
      MaintenanceJobPlanEntity,
      MaintenanceJobPlanVersionEntity,
      MaintenanceJobPlanStepEntity,
      MaintenanceScheduleEntity,
      MaintenanceScheduleTargetEntity,
      MaintenanceTriggerEntity,
      MaintenanceOccurrenceEntity,
      EquipmentGroupEntity,
      EquipmentGroupMemberEntity,
      EquipmentEntity,
      EquipmentMeterEntity,
      EquipmentMeterReadingEntity,
      SiteEntity,
      TenantEntity,
      WorkflowDefinitionEntity,
      NotificationEntity,
      WorkOrderEntity,
    ]),
  ],
  controllers: [MaintenancePlatformController, MaintenanceController],
  providers: [
    MaintenanceService,
    MaintenanceJobPlanService,
    MaintenanceSchedulingService,
    EquipmentMeterService,
    MaintenanceOccurrenceScheduler,
    MaintenanceReminderScheduler,
    TenantModuleGuard,
  ],
  exports: [MaintenanceSchedulingService],
})
export class MaintenanceModule {}
