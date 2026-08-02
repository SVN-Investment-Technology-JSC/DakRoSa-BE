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
import { EquipmentEntity } from './equipment.entity';
import { MaintenanceScheduleEntity } from './maintenance-schedule.entity';
import { MaintenanceTriggerEntity } from './maintenance-trigger.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'maintenance_occurrences' })
@Unique('UQ_maintenance_occurrences_tenant_dedupe', ['tenantId', 'dedupeKey'])
export class MaintenanceOccurrenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'schedule_id', type: 'uuid' })
  @Index()
  scheduleId!: string;

  @ManyToOne(() => MaintenanceScheduleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: MaintenanceScheduleEntity;

  @Column({ name: 'trigger_id', type: 'uuid' })
  triggerId!: string;

  @ManyToOne(() => MaintenanceTriggerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trigger_id' })
  trigger!: MaintenanceTriggerEntity;

  @Column({ name: 'equipment_id', type: 'uuid', nullable: true })
  @Index()
  equipmentId!: string | null;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: EquipmentEntity | null;

  @Column({ name: 'planned_start_at', type: 'timestamptz' })
  @Index()
  plannedStartAt!: Date;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ length: 30, default: 'planned' })
  status!: 'planned' | 'generated' | 'completed' | 'skipped' | 'cancelled';

  @Column({ name: 'dedupe_key', length: 180 })
  dedupeKey!: string;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  snapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
