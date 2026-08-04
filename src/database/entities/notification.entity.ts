import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const NOTIFICATION_TYPES = [
  'work_order_assigned',
  'work_order_sla_warning',
  'work_order_overdue',
  'workflow_task_assigned',
  'workflow_task_rejected',
  'workflow_completed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  /** Người nhận thông báo */
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ length: 40 })
  type!: NotificationType;

  @Column({ length: 220 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  /** Link điều hướng khi click thông báo, ví dụ "/work-orders/xxx" */
  @Column({ name: 'action_url', type: 'varchar', length: 500, nullable: true })
  actionUrl!: string | null;

  /** Dữ liệu kèm theo để FE render chi tiết */
  @Column({ type: 'jsonb', default: () => "'{}' ::jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  @Index()
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt!: Date;
}
