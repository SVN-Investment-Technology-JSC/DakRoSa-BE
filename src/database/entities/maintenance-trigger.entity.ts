import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaintenanceScheduleEntity } from './maintenance-schedule.entity';

export enum MaintenanceTriggerType {
  TIME_RRULE = 'TIME_RRULE',
  METER_THRESHOLD = 'METER_THRESHOLD',
  DOMAIN_EVENT = 'DOMAIN_EVENT',
  CONDITION = 'CONDITION',
}

@Entity({ name: 'maintenance_triggers' })
export class MaintenanceTriggerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  @Index()
  scheduleId!: string;

  @ManyToOne(() => MaintenanceScheduleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: MaintenanceScheduleEntity;

  @Column({ type: 'enum', enum: MaintenanceTriggerType })
  type!: MaintenanceTriggerType;

  @Column({ type: 'jsonb' })
  config!: Record<string, unknown>;

  @Column({ name: 'next_due_at', type: 'timestamptz', nullable: true })
  @Index()
  nextDueAt!: Date | null;

  @Column({ name: 'last_fired_at', type: 'timestamptz', nullable: true })
  lastFiredAt!: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
