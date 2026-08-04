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

@Entity('workflow_transitions')
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @Column({ name: 'source_key', length: 100, nullable: true })
  sourceKey!: string;

  @Column({ name: 'target_key', length: 100, nullable: true })
  targetKey!: string;

  @Column({ name: 'action_key', length: 100 })
  actionKey!: string;

  @Column({ length: 255 })
  label!: string;

  @Column({ type: 'jsonb', nullable: true })
  condition!: Record<string, unknown> | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => WorkflowVersionEntity, (version) => version.transitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'version_id' })
  version!: WorkflowVersionEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
