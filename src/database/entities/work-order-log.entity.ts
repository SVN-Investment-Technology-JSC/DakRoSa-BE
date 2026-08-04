import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { WorkOrderEntity } from './work-order.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'work_order_logs' })
export class WorkOrderLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId!: string;

  @ManyToOne(() => WorkOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder!: WorkOrderEntity;

  /** Alias cho user_id để engine service dùng thống nhất */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** actorId là alias đọc được ở service – map sang user_id */
  get actorId(): string {
    return this.userId;
  }
  set actorId(value: string) {
    this.userId = value;
  }

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 100 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** Dữ liệu bổ sung: formData, stepKey, v.v. */
  @Column({ type: 'jsonb', default: () => "'{}' ::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
