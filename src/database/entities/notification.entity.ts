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
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'notifications' })
@Unique('UQ_notifications_tenant_user_dedupe', [
  'tenantId',
  'userId',
  'dedupeKey',
])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 80 })
  type!: string;

  @Column({ length: 180 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({
    name: 'resource_type',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({
    name: 'action_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  actionUrl!: string | null;

  @Column({
    name: 'dedupe_key',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  dedupeKey!: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt!: Date;
}
