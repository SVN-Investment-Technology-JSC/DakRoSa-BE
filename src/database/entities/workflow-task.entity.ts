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
import { UserEntity } from './user.entity';
import { WorkflowInstanceEntity } from './workflow-instance.entity';
import { WorkflowNodeEntity } from './workflow-node.entity';

export type WorkflowTaskStatus =
  'pending' | 'claimed' | 'completed' | 'cancelled' | 'blocked';

@Entity({ name: 'workflow_tasks' })
export class WorkflowTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  @Index()
  instanceId!: string;

  @ManyToOne(() => WorkflowInstanceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance!: WorkflowInstanceEntity;

  @Column({ name: 'node_id', type: 'uuid' })
  nodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'node_id' })
  node!: WorkflowNodeEntity;

  @Column({ length: 180 })
  name!: string;

  @Column({ length: 30, default: 'pending' })
  @Index()
  status!: WorkflowTaskStatus;

  @Column({ name: 'claimed_by', type: 'uuid', nullable: true })
  claimedBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'claimed_by' })
  claimant!: UserEntity | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  @Index()
  dueAt!: Date | null;

  @Column({ name: 'activated_at', type: 'timestamptz', default: () => 'now()' })
  activatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
