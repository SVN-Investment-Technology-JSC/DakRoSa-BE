import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { MaterialEntity } from './material.entity';
import { WarehouseEntity } from './warehouse.entity';

@Entity({ name: 'material_inventory' })
export class MaterialInventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId!: string;

  @ManyToOne(() => MaterialEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material!: MaterialEntity;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
