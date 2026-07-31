import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { WorkOrderEntity } from './work-order.entity';

export enum WorkOrderUpdateType {
  PROGRESS = 'PROGRESS',
  BLOCKER = 'BLOCKER',
  SUPPORT_REQUEST = 'SUPPORT_REQUEST',
  RESULT = 'RESULT',
  COMMENT = 'COMMENT',
}

@Entity({ name: 'work_order_updates' })
export class WorkOrderUpdateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'work_order_id', type: 'uuid' })
  @Index()
  workOrderId!: string;

  @ManyToOne(() => WorkOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder!: WorkOrderEntity;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor!: UserEntity;

  @Column({ type: 'enum', enum: WorkOrderUpdateType })
  type!: WorkOrderUpdateType;

  @Column({ name: 'progress_percent', type: 'integer', nullable: true })
  progressPercent!: number | null;

  @Column({ type: 'text' })
  note!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
