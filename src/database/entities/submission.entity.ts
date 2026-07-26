import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SubmissionActionEntity } from './submission-action.entity';

export const SUBMISSION_STATUSES = [
  'draft',
  'in_review',
  'returned',
  'approved',
  'cancelled',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_PRIORITIES = ['normal', 'high', 'urgent'] as const;

export type SubmissionPriority = (typeof SUBMISSION_PRIORITIES)[number];

@Entity({ name: 'submissions' })
@Unique('UQ_submissions_tenant_code', ['tenantId', 'code'])
export class SubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ length: 40 })
  code!: string;

  @Column({ length: 220 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'document_type', length: 80 })
  documentType!: string;

  @Column({ length: 20, default: 'normal' })
  priority!: SubmissionPriority;

  @Column({ length: 30, default: 'draft' })
  @Index()
  status!: SubmissionStatus;

  @Column({ name: 'workflow_key', length: 80, default: 'standard-approval' })
  workflowKey!: string;

  @Column({ name: 'workflow_version', type: 'integer', default: 1 })
  workflowVersion!: number;

  @Column({ name: 'current_step', length: 80, default: 'draft' })
  currentStep!: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  @Index()
  requesterId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requester_id' })
  requester!: UserEntity;

  @Column({
    name: 'current_assignee_id',
    type: 'uuid',
    nullable: true,
  })
  @Index()
  currentAssigneeId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'current_assignee_id' })
  currentAssignee!: UserEntity | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @OneToMany(() => SubmissionActionEntity, (action) => action.submission)
  actions!: SubmissionActionEntity[];

  @VersionColumn({ name: 'row_version' })
  rowVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
