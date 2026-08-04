import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';
import { WorkflowNodeEntity } from './workflow-node.entity';
import { WorkflowTransitionEntity } from './workflow-transition.entity';

export enum WorkflowVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  RETIRED = 'retired',
}

@Entity('workflow_versions')
export class WorkflowVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: WorkflowVersionStatus.DRAFT,
  })
  status!: string;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @ManyToOne(() => WorkflowDefinitionEntity, (def) => def.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'definition_id' })
  definition!: WorkflowDefinitionEntity;

  @OneToMany(() => WorkflowNodeEntity, (node) => node.version, { cascade: true })
  nodes!: WorkflowNodeEntity[];

  @OneToMany(() => WorkflowTransitionEntity, (trans) => trans.version, { cascade: true })
  transitions!: WorkflowTransitionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
