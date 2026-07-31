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
import { UserEntity } from './user.entity';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';

export type WorkflowVersionStatus = 'draft' | 'published' | 'retired';

@Entity({ name: 'workflow_versions' })
@Unique('UQ_workflow_versions_definition_number', [
  'definitionId',
  'versionNumber',
])
export class WorkflowVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  @Index()
  definitionId!: string;

  @ManyToOne(() => WorkflowDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition!: WorkflowDefinitionEntity;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber!: number;

  @Column({ length: 30, default: 'draft' })
  status!: WorkflowVersionStatus;

  @Column({ name: 'schema_version', type: 'integer', default: 1 })
  schemaVersion!: number;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity | null;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
