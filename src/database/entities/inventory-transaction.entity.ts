import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { MaterialEntity } from './material.entity';
import { WarehouseEntity } from './warehouse.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'inventory_transactions' })
export class InventoryTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId!: string;

  @ManyToOne(() => MaterialEntity)
  @JoinColumn({ name: 'material_id' })
  material!: MaterialEntity;

  @Column({ length: 50 })
  type!: 'IMPORT' | 'EXPORT';

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
