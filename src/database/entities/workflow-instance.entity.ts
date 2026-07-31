import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';
import { WorkflowNodeEntity } from './workflow-node.entity';
import { WorkflowVersionEntity } from './workflow-version.entity';

export type WorkflowInstanceStatus =
  'running' | 'blocked' | 'completed' | 'cancelled';

@Entity({ name: 'workflow_instances' })
@Index('IDX_workflow_instances_resource', [
  'tenantId',
  'resourceType',
  'resourceId',
])
export class WorkflowInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId!: string;

  @ManyToOne(() => WorkflowDefinitionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'definition_id' })
  definition!: WorkflowDefinitionEntity;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @ManyToOne(() => WorkflowVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'version_id' })
  version!: WorkflowVersionEntity;

  @Column({ name: 'resource_type', length: 80 })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ name: 'current_node_id', type: 'uuid', nullable: true })
  currentNodeId!: string | null;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'current_node_id' })
  currentNode!: WorkflowNodeEntity | null;

  @Column({ length: 30, default: 'running' })
  status!: WorkflowInstanceStatus;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  context!: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
