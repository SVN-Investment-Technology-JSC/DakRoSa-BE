import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkOrderEntity } from './work-order.entity';
import { MaterialEntity } from './material.entity';
import { WarehouseEntity } from './warehouse.entity';

@Entity({ name: 'work_order_materials' })
export class WorkOrderMaterialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId!: string;

  @ManyToOne(() => WorkOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder!: WorkOrderEntity;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId!: string;

  @ManyToOne(() => MaterialEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'material_id' })
  material!: MaterialEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
