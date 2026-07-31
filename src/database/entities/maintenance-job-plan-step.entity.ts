import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MaintenanceJobPlanVersionEntity } from './maintenance-job-plan-version.entity';

export enum MaintenanceStepType {
  INSTRUCTION = 'INSTRUCTION',
  CHECKLIST = 'CHECKLIST',
  MEASUREMENT = 'MEASUREMENT',
  EVIDENCE = 'EVIDENCE',
}

@Entity({ name: 'maintenance_job_plan_steps' })
@Unique('UQ_maintenance_job_plan_steps_version_key', ['versionId', 'key'])
export class MaintenanceJobPlanStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'version_id', type: 'uuid' })
  @Index()
  versionId!: string;

  @ManyToOne(() => MaintenanceJobPlanVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version!: MaintenanceJobPlanVersionEntity;

  @Column({ length: 80 })
  key!: string;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @Column({ type: 'enum', enum: MaintenanceStepType })
  type!: MaintenanceStepType;

  @Column({ length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_required', default: true })
  isRequired!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config!: Record<string, unknown>;
}
