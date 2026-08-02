import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import {
  NotificationEntity,
  OrganizationUnitEntity,
  TenantMembershipEntity,
  WorkflowActionEntity,
  WorkflowAssigneeRuleEntity,
  WorkflowDefinitionEntity,
  WorkflowInstanceEntity,
  WorkflowNodeEntity,
  WorkflowTaskAssignmentEntity,
  WorkflowTaskEntity,
  WorkflowTokenEntity,
  WorkflowTransitionEntity,
  WorkflowVersionEntity,
} from '../database/entities';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionEntity,
      WorkflowVersionEntity,
      WorkflowNodeEntity,
      WorkflowTransitionEntity,
      WorkflowAssigneeRuleEntity,
      WorkflowInstanceEntity,
      WorkflowTokenEntity,
      WorkflowTaskEntity,
      WorkflowTaskAssignmentEntity,
      WorkflowActionEntity,
      TenantMembershipEntity,
      NotificationEntity,
      OrganizationUnitEntity,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, TenantModuleGuard],
  exports: [WorkflowService],
})
export class WorkflowModule {}
