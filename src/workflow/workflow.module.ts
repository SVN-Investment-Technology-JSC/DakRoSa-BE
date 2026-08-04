import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowTemplateEntity } from '../database/entities/workflow-template.entity';
import { WorkflowNodeEntity } from '../database/entities/workflow-node.entity';
import { WorkflowTransitionEntity } from '../database/entities/workflow-transition.entity';
import { NotificationEntity } from '../database/entities/notification.entity';
import { WorkOrderEntity } from '../database/entities/work-order.entity';
import { WorkOrderLogEntity } from '../database/entities/work-order-log.entity';
import { TenantMembershipEntity } from '../database/entities/tenant-membership.entity';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowTemplateEntity,
      WorkflowNodeEntity,
      WorkflowTransitionEntity,
      NotificationEntity,
      WorkOrderEntity,
      WorkOrderLogEntity,
      TenantMembershipEntity,
    ]),
  ],
  providers: [WorkflowEngineService],
  controllers: [WorkflowController],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {}
