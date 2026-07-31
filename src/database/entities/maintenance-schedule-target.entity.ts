import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MaintenanceScheduleEntity } from './maintenance-schedule.entity';

export enum MaintenanceTargetType {
  EQUIPMENT = 'EQUIPMENT',
  EQUIPMENT_GROUP = 'EQUIPMENT_GROUP',
}

@Entity({ name: 'maintenance_schedule_targets' })
@Unique('UQ_maintenance_schedule_targets_schedule_target', [
  'scheduleId',
  'targetType',
  'targetId',
])
export class MaintenanceScheduleTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  @Index()
  scheduleId!: string;

  @ManyToOne(() => MaintenanceScheduleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: MaintenanceScheduleEntity;

  @Column({ name: 'target_type', type: 'enum', enum: MaintenanceTargetType })
  targetType!: MaintenanceTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;
}
