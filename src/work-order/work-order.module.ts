import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { WorkflowModule } from '../workflow/workflow.module';
import { MaintenanceWorkOrderScheduler } from './maintenance-work-order.scheduler';
import {
  EquipmentEntity,
  WorkOrderEntity,
  WorkOrderLogEntity,
  WorkOrderMaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
  SiteEntity,
  TenantEntity,
  TenantMembershipEntity,
  WorkflowDefinitionEntity,
  MaintenanceScheduleEntity,
  MaintenanceOccurrenceEntity,
  MaintenanceJobPlanVersionEntity,
  MaintenanceJobPlanStepEntity,
  WorkOrderUpdateEntity,
  WorkOrderChecklistResultEntity,
} from '../database/entities';

@Module({
  imports: [
    WorkflowModule,
    TypeOrmModule.forFeature([
      EquipmentEntity,
      WorkOrderEntity,
      WorkOrderLogEntity,
      WorkOrderMaterialEntity,
      MaterialInventoryEntity,
      InventoryTransactionEntity,
      SiteEntity,
      TenantEntity,
      TenantMembershipEntity,
      WorkflowDefinitionEntity,
      MaintenanceScheduleEntity,
      MaintenanceOccurrenceEntity,
      MaintenanceJobPlanVersionEntity,
      MaintenanceJobPlanStepEntity,
      WorkOrderUpdateEntity,
      WorkOrderChecklistResultEntity,
    ]),
  ],
  controllers: [WorkOrderController],
  providers: [
    WorkOrderService,
    MaintenanceWorkOrderScheduler,
    TenantModuleGuard,
  ],
})
export class WorkOrderModule {}
