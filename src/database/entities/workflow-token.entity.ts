import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowInstanceEntity } from './workflow-instance.entity';
import { WorkflowNodeEntity } from './workflow-node.entity';

@Entity({ name: 'workflow_tokens' })
export class WorkflowTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  @Index()
  instanceId!: string;

  @ManyToOne(() => WorkflowInstanceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance!: WorkflowInstanceEntity;

  @Column({ name: 'node_id', type: 'uuid' })
  @Index()
  nodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'node_id' })
  node!: WorkflowNodeEntity;

  @Column({ length: 20, default: 'active' })
  status!: 'active' | 'consumed' | 'cancelled';

  @Column({
    name: 'branch_key',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  branchKey!: string | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
