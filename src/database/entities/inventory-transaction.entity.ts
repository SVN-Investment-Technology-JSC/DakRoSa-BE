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

export type InventoryTransactionType =
  | 'IMPORT'
  | 'EXPORT'
  | 'TRANSFER'
  | 'BORROW'
  | 'RETURN'
  | 'ADJUST'
  | 'IN'
  | 'OUT';

@Entity({ name: 'inventory_transactions' })
export class InventoryTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'transaction_code', type: 'varchar', length: 100, nullable: true })
  transactionCode!: string | null;

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

  @Column({ type: 'varchar', length: 50 })
  type!: InventoryTransactionType;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType!: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId!: string | null;

  @Column({ name: 'workflow_request_id', type: 'uuid', nullable: true })
  workflowRequestId!: string | null;

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
