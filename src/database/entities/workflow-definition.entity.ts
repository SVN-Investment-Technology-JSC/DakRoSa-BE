import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowVersionEntity } from './workflow-version.entity';

export enum WorkflowDefinitionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('workflow_definitions')
export class WorkflowDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ length: 100 })
  key!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'resource_type', length: 100, default: 'work_order' })
  resourceType!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: WorkflowDefinitionStatus.DRAFT,
  })
  status!: string;

  @Column({ name: 'current_version_id', type: 'uuid', nullable: true })
  currentVersionId!: string | null;

  @OneToMany(() => WorkflowVersionEntity, (version) => version.definition)
  versions!: WorkflowVersionEntity[];

  @ManyToOne(() => WorkflowVersionEntity, { nullable: true })
  @JoinColumn({ name: 'current_version_id' })
  currentVersion!: WorkflowVersionEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
