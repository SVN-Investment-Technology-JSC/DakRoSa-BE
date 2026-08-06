import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { NotificationEntity } from '../database/entities/notification.entity';
import { OrganizationUnitEntity } from '../database/entities/organization-unit.entity';
import { TenantMembershipEntity } from '../database/entities/tenant-membership.entity';
import { WorkflowActionEntity } from '../database/entities/workflow-action.entity';
import { WorkflowAssigneeRuleEntity } from '../database/entities/workflow-assignee-rule.entity';
import { WorkflowDefinitionEntity } from '../database/entities/workflow-definition.entity';
import { WorkflowInstanceEntity } from '../database/entities/workflow-instance.entity';
import { WorkflowNodeEntity } from '../database/entities/workflow-node.entity';
import { WorkflowRoleMappingEntity } from '../database/entities/workflow-role-mapping.entity';
import { WorkflowTaskAssignmentEntity } from '../database/entities/workflow-task-assignment.entity';
import { WorkflowTaskEntity } from '../database/entities/workflow-task.entity';
import { WorkflowTokenEntity } from '../database/entities/workflow-token.entity';
import { WorkflowTransitionEntity } from '../database/entities/workflow-transition.entity';
import { WorkflowVersionEntity } from '../database/entities/workflow-version.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionEntity,
      WorkflowVersionEntity,
      WorkflowNodeEntity,
      WorkflowRoleMappingEntity,
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
