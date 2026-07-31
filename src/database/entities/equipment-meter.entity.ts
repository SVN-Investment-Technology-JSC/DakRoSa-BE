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
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'equipment_meters' })
@Unique('UQ_equipment_meters_equipment_code', ['equipmentId', 'code'])
export class EquipmentMeterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'equipment_id', type: 'uuid' })
  @Index()
  equipmentId!: string;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: EquipmentEntity;

  @Column({ length: 80 })
  code!: string;

  @Column({ length: 180 })
  name!: string;

  @Column({ length: 40 })
  unit!: string;

  @Column({ name: 'rollover_value', type: 'double precision', nullable: true })
  rolloverValue!: number | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
