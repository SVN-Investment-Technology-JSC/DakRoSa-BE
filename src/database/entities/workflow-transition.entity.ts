import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { WorkflowNodeEntity } from './workflow-node.entity';
import { WorkflowVersionEntity } from './workflow-version.entity';

@Entity({ name: 'workflow_transitions' })
@Unique('UQ_workflow_transitions_version_action_source', [
  'versionId',
  'sourceNodeId',
  'actionKey',
])
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  @Index()
  versionId!: string;

  @ManyToOne(() => WorkflowVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version!: WorkflowVersionEntity;

  @Column({ name: 'source_node_id', type: 'uuid' })
  sourceNodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_node_id' })
  sourceNode!: WorkflowNodeEntity;

  @Column({ name: 'target_node_id', type: 'uuid' })
  targetNodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_node_id' })
  targetNode!: WorkflowNodeEntity;

  @Column({ name: 'action_key', length: 80 })
  actionKey!: string;

  @Column({ length: 120 })
  label!: string;

  @Column({ type: 'jsonb', nullable: true })
  condition!: Record<string, unknown> | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
