import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowVersionEntity } from './workflow-version.entity';

export type WorkflowNodeType =
  | 'START'
  | 'HUMAN_TASK'
  | 'SERVICE_TASK'
  | 'CONDITION'
  | 'PARALLEL_SPLIT'
  | 'PARALLEL_JOIN'
  | 'END';

export type WorkflowAssigneeType =
  | 'USER'
  | 'ORGANIZATION_UNIT'
  | 'POSITION'
  | 'ROLE'
  | 'REQUEST_FIELD'
  | 'CREATOR'
  | 'PREVIOUS_STEP_ACTOR'
  | 'MANAGER_OF_REQUESTER';

export interface WorkflowAssignee {
  id?: string;
  nodeId?: string;
  type: WorkflowAssigneeType;
  subjectId?: string | null;
  fieldKey?: string | null;
  strategy: 'ANY' | 'ALL' | 'QUORUM';
  quorum?: number | null;
  config: Record<string, unknown>;
}

@Entity('workflow_nodes')
export class WorkflowNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @Column({ length: 100 })
  key!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: WorkflowNodeType;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: {} })
  config!: Record<string, unknown>;

  @Column({ name: 'ui_position', type: 'jsonb', default: {} })
  uiPosition!: { x?: number; y?: number };

  @Column({ type: 'jsonb', default: [] })
  assignees!: WorkflowAssignee[];

  @ManyToOne(() => WorkflowVersionEntity, (version) => version.nodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'version_id' })
  version!: WorkflowVersionEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
