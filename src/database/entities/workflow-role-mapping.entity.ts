import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';

export enum WorkflowRoleMappingTargetType {
  USER = 'USER',
  ROLE = 'ROLE',
  POSITION = 'POSITION',
  ORGANIZATION_UNIT = 'ORGANIZATION_UNIT',
}

@Entity({ name: 'workflow_role_mappings' })
@Unique('UQ_workflow_role_mappings_definition_variable_target', [
  'definitionId',
  'variableKey',
  'targetType',
  'targetId',
])
export class WorkflowRoleMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  @Index()
  definitionId!: string;

  @ManyToOne(() => WorkflowDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition!: WorkflowDefinitionEntity;

  @Column({ name: 'variable_key', length: 80 })
  variableKey!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 40 })
  targetType!: WorkflowRoleMappingTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
