import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { WorkflowInstanceEntity } from './workflow-instance.entity';
import { WorkflowNodeEntity } from './workflow-node.entity';
import { WorkflowTaskEntity } from './workflow-task.entity';

@Entity({ name: 'workflow_actions' })
@Unique('UQ_workflow_actions_tenant_idempotency', [
  'tenantId',
  'idempotencyKey',
])
export class WorkflowActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'instance_id', type: 'uuid' })
  @Index()
  instanceId!: string;

  @ManyToOne(() => WorkflowInstanceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance!: WorkflowInstanceEntity;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId!: string | null;

  @ManyToOne(() => WorkflowTaskEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task!: WorkflowTaskEntity | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: UserEntity | null;

  @Column({ name: 'action_key', length: 80 })
  actionKey!: string;

  @Column({ name: 'from_node_id', type: 'uuid', nullable: true })
  fromNodeId!: string | null;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'from_node_id' })
  fromNode!: WorkflowNodeEntity | null;

  @Column({ name: 'to_node_id', type: 'uuid', nullable: true })
  toNodeId!: string | null;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'to_node_id' })
  toNode!: WorkflowNodeEntity | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
