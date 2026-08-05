import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowNodeEntity } from './workflow-node.entity';

export enum WorkflowAssigneeType {
  USER = 'USER',
  ORGANIZATION_UNIT = 'ORGANIZATION_UNIT',
  POSITION = 'POSITION',
  ROLE = 'ROLE',
  REQUEST_FIELD = 'REQUEST_FIELD',
  CREATOR = 'CREATOR',
  PREVIOUS_STEP_ACTOR = 'PREVIOUS_STEP_ACTOR',
  MANAGER_OF_REQUESTER = 'MANAGER_OF_REQUESTER',
}

export enum WorkflowAssignmentRole {
  EXECUTOR = 'EXECUTOR',
  OBSERVER = 'OBSERVER',
}

@Entity({ name: 'workflow_assignee_rules' })
export class WorkflowAssigneeRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'node_id', type: 'uuid' })
  @Index()
  nodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node!: WorkflowNodeEntity;

  @Column({ type: 'enum', enum: WorkflowAssigneeType })
  type!: WorkflowAssigneeType;

  @Column({ name: 'subject_id', type: 'uuid', nullable: true })
  subjectId!: string | null;

  @Column({
    name: 'field_key',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  fieldKey!: string | null;

  @Column({
    name: 'assignee_variable_key',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  assigneeVariableKey!: string | null;

  @Column({
    name: 'assignment_role',
    type: 'varchar',
    length: 20,
    default: WorkflowAssignmentRole.EXECUTOR,
  })
  assignmentRole!: WorkflowAssignmentRole;

  @Column({ length: 20, default: 'ANY' })
  strategy!: 'ANY' | 'ALL' | 'QUORUM';

  @Column({ type: 'integer', nullable: true })
  quorum!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config!: Record<string, unknown>;
}
