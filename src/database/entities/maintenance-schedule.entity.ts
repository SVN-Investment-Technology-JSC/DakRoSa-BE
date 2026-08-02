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
import { SiteEntity } from './site.entity';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';

@Entity({ name: 'maintenance_schedules' })
@Unique('UQ_maintenance_schedules_tenant_code', ['tenantId', 'code'])
export class MaintenanceScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  @Index()
  siteId!: string | null;

  @ManyToOne(() => SiteEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'site_id' })
  site!: SiteEntity | null;

  @Column({ length: 80 })
  code!: string;

  @Column({ length: 180 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'job_plan_id', type: 'uuid' })
  jobPlanId!: string;

  @ManyToOne(() => MaintenanceJobPlanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'job_plan_id' })
  jobPlan!: MaintenanceJobPlanEntity;

  @Column({ name: 'workflow_definition_id', type: 'uuid' })
  workflowDefinitionId!: string;

  @ManyToOne(() => WorkflowDefinitionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workflow_definition_id' })
  workflowDefinition!: WorkflowDefinitionEntity;

  @Column({ name: 'default_assignee_id', type: 'uuid', nullable: true })
  defaultAssigneeId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'default_assignee_id' })
  defaultAssignee!: UserEntity | null;

  @Column({
    name: 'default_technical_reviewer_id',
    type: 'uuid',
    nullable: true,
  })
  defaultTechnicalReviewerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'default_technical_reviewer_id' })
  defaultTechnicalReviewer!: UserEntity | null;

  @Column({ length: 30, default: 'draft' })
  status!: 'draft' | 'active' | 'paused' | 'archived';

  @Column({ length: 60 })
  timezone!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({
    name: 'reminder_minutes',
    type: 'jsonb',
    default: () => "'[1440]'::jsonb",
  })
  reminderMinutes!: number[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
