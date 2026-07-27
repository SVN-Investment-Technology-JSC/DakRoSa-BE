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
import { SubmissionEntity } from './submission.entity';
import { UserEntity } from './user.entity';

export const SIGNATURE_REQUEST_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export type SignatureRequestStatus =
  (typeof SIGNATURE_REQUEST_STATUSES)[number];

@Entity({ name: 'signature_requests' })
@Unique('UQ_signature_requests_submission', ['submissionId'])
export class SignatureRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @ManyToOne(() => SubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission!: SubmissionEntity;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requester!: UserEntity;

  @Column({ length: 60, default: 'unconfigured' })
  provider!: string;

  @Column({ name: 'signing_mode', length: 40, default: 'remote' })
  signingMode!: string;

  @Column({ length: 30, default: 'pending' })
  @Index()
  status!: SignatureRequestStatus;

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  externalReference!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
