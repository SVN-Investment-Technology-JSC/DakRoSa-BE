import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EquipmentMeterEntity } from './equipment-meter.entity';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'equipment_meter_readings' })
@Unique('UQ_equipment_meter_readings_tenant_external', [
  'tenantId',
  'externalId',
])
export class EquipmentMeterReadingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'meter_id', type: 'uuid' })
  @Index()
  meterId!: string;

  @ManyToOne(() => EquipmentMeterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: EquipmentMeterEntity;

  @Column({ type: 'double precision' })
  value!: number;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  @Index()
  occurredAt!: Date;

  @Column({ length: 30, default: 'manual' })
  source!: string;

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  externalId!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
