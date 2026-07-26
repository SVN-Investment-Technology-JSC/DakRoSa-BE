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
import { OrganizationUnitEntity } from './organization-unit.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'positions' })
@Unique('UQ_positions_tenant_code', ['tenantId', 'code'])
export class PositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'organization_unit_id', type: 'uuid', nullable: true })
  @Index()
  organizationUnitId!: string | null;

  @ManyToOne(() => OrganizationUnitEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'organization_unit_id' })
  organizationUnit!: OrganizationUnitEntity | null;

  @Column({ length: 60 })
  code!: string;

  @Column({ length: 180 })
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
