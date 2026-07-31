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
import { TenantEntity } from './tenant.entity';
import { EquipmentEntity } from './equipment.entity';
import { UserEntity } from './user.entity';
import { SiteEntity } from './site.entity';

export enum WorkOrderType {
  INCIDENT = 'INCIDENT',
  MAINTENANCE = 'MAINTENANCE',
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'work_orders' })
@Unique('UQ_work_orders_tenant_code', ['tenantId', 'code'])
@Index('UQ_work_orders_maintenance_occurrence', ['maintenanceOccurrenceId'], {
  unique: true,
  where: '"maintenance_occurrence_id" IS NOT NULL',
})
export class WorkOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ length: 100 })
  code!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: WorkOrderType })
  type!: WorkOrderType;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.DRAFT,
  })
  status!: WorkOrderStatus;

  @Column({ length: 50, default: 'NORMAL' })
  priority!: string;

  @Column({ name: 'equipment_id', type: 'uuid', nullable: true })
  equipmentId!: string | null;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: EquipmentEntity | null;

  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId!: string | null;

  @ManyToOne(() => SiteEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'site_id' })
  site!: SiteEntity | null;

  @Column({ name: 'reporter_id', type: 'uuid', nullable: true })
  reporterId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: UserEntity | null;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: UserEntity | null;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime!: Date | null;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime!: Date | null;

  @Column({ name: 'downtime_minutes', type: 'int', default: 0 })
  downtimeMinutes!: number;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause!: string | null;

  @Column({ name: 'planned_start_at', type: 'timestamptz', nullable: true })
  plannedStartAt!: Date | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ name: 'progress_percent', type: 'integer', default: 0 })
  progressPercent!: number;

  @Column({ name: 'maintenance_schedule_id', type: 'uuid', nullable: true })
  maintenanceScheduleId!: string | null;

  @Column({ name: 'maintenance_occurrence_id', type: 'uuid', nullable: true })
  maintenanceOccurrenceId!: string | null;

  @Column({ name: 'job_plan_version_id', type: 'uuid', nullable: true })
  jobPlanVersionId!: string | null;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId!: string | null;

  @Column({
    name: 'custom_fields',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  customFields!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  attachments!: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
