import {
  JoinColumn,
  ManyToOne,
  OneToMany,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { OrganizationUnitEntity } from './organization-unit.entity';
import { UserEntity } from './user.entity';
import { WarehouseLocationEntity } from './warehouse-location.entity';

@Entity({ name: 'warehouses' })
export class WarehouseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'org_unit_id', type: 'uuid', nullable: true })
  orgUnitId!: string | null;

  @ManyToOne(() => OrganizationUnitEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit!: OrganizationUnitEntity | null;

  @Column({ name: 'manager_user_id', type: 'uuid', nullable: true })
  managerUserId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_user_id' })
  managerUser!: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  location!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(
    () => WarehouseLocationEntity,
    (location) => location.warehouse,
  )
  locations!: WarehouseLocationEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
