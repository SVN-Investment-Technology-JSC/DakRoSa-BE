import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinitionEntity } from '../database/entities/workflow-definition.entity';
import { WorkflowVersionEntity } from '../database/entities/workflow-version.entity';
import { WorkflowRoleMappingEntity } from '../database/entities/workflow-role-mapping.entity';
import { WorkflowNodeEntity } from '../database/entities/workflow-node.entity';
import { WorkflowTransitionEntity } from '../database/entities/workflow-transition.entity';
import { NotificationEntity } from '../database/entities/notification.entity';
import { WorkOrderEntity } from '../database/entities/work-order.entity';
import { WorkOrderLogEntity } from '../database/entities/work-order-log.entity';
import { TenantMembershipEntity } from '../database/entities/tenant-membership.entity';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowController } from './workflow.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionEntity,
      WorkflowVersionEntity,
      WorkflowRoleMappingEntity,
      WorkflowNodeEntity,
      WorkflowTransitionEntity,
      NotificationEntity,
      WorkOrderEntity,
      WorkOrderLogEntity,
      TenantMembershipEntity,
    ]),
    NotificationModule,
  ],
  providers: [WorkflowEngineService],
  controllers: [WorkflowController],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {}
