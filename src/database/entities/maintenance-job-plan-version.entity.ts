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
import { MaintenanceJobPlanEntity } from './maintenance-job-plan.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'maintenance_job_plan_versions' })
@Unique('UQ_maintenance_job_plan_versions_plan_number', [
  'jobPlanId',
  'versionNumber',
])
export class MaintenanceJobPlanVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_plan_id', type: 'uuid' })
  @Index()
  jobPlanId!: string;

  @ManyToOne(() => MaintenanceJobPlanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_plan_id' })
  jobPlan!: MaintenanceJobPlanEntity;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber!: number;

  @Column({ length: 30, default: 'draft' })
  status!: 'draft' | 'published' | 'retired';

  @Column({ name: 'estimated_minutes', type: 'integer', nullable: true })
  estimatedMinutes!: number | null;

  @Column({
    name: 'required_skills',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  requiredSkills!: string[];

  @Column({
    name: 'custom_fields',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  customFields!: Record<string, unknown>;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'published_by' })
  publisher!: UserEntity | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
