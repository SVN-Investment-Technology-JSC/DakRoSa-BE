import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubmissionEntity, SubmissionStatus } from './submission.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'submission_actions' })
export class SubmissionActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  @Index()
  submissionId!: string;

  @ManyToOne(() => SubmissionEntity, (submission) => submission.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission!: SubmissionEntity;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor!: UserEntity;

  @Column({ length: 40 })
  action!: string;

  @Column({
    name: 'from_status',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  fromStatus!: SubmissionStatus | null;

  @Column({ name: 'to_status', length: 30 })
  toStatus!: SubmissionStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
