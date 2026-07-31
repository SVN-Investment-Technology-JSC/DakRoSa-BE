import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { WorkflowVersionEntity } from './workflow-version.entity';

export enum WorkflowNodeType {
  START = 'START',
  HUMAN_TASK = 'HUMAN_TASK',
  SERVICE_TASK = 'SERVICE_TASK',
  CONDITION = 'CONDITION',
  PARALLEL_SPLIT = 'PARALLEL_SPLIT',
  PARALLEL_JOIN = 'PARALLEL_JOIN',
  END = 'END',
}

@Entity({ name: 'workflow_nodes' })
@Unique('UQ_workflow_nodes_version_key', ['versionId', 'key'])
export class WorkflowNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  @Index()
  versionId!: string;

  @ManyToOne(() => WorkflowVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version!: WorkflowVersionEntity;

  @Column({ length: 80 })
  key!: string;

  @Column({ type: 'enum', enum: WorkflowNodeType })
  type!: WorkflowNodeType;

  @Column({ length: 180 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config!: Record<string, unknown>;

  @Column({ name: 'ui_position', type: 'jsonb', default: () => "'{}'::jsonb" })
  uiPosition!: { x?: number; y?: number };
}
