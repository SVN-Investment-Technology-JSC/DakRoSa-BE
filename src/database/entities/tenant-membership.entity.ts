import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';
import { OrganizationUnitEntity } from './organization-unit.entity';
import { PositionEntity } from './position.entity';

@Entity({ name: 'tenant_memberships' })
@Unique('UQ_tenant_memberships_tenant_user', ['tenantId', 'userId'])
export class TenantMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 30, default: 'active' })
  status!: string;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'organization_unit_id', type: 'uuid', nullable: true })
  @Index()
  organizationUnitId!: string | null;

  @ManyToOne(() => OrganizationUnitEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'organization_unit_id' })
  organizationUnit!: OrganizationUnitEntity | null;

  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  @Index()
  positionId!: string | null;

  @ManyToOne(() => PositionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'position_id' })
  position!: PositionEntity | null;

  @Column({ name: 'data_scope', length: 30, default: 'tenant' })
  dataScope!: 'tenant' | 'organization_unit' | 'site' | 'own';

  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable({
    name: 'membership_roles',
    joinColumn: { name: 'membership_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: RoleEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
