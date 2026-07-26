import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SiteEntity } from './site.entity';
import { TenantMembershipEntity } from './tenant-membership.entity';
import { TenantModuleKey } from '../../common/constants/tenant-modules';

@Entity({ name: 'tenants' })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 80 })
  slug!: string;

  @Column({ unique: true, length: 40 })
  code!: string;

  @Column({ length: 180 })
  name!: string;

  @Column({ name: 'short_name', length: 100 })
  shortName!: string;

  @Column({ length: 30, default: 'active' })
  @Index()
  status!: string;

  @Column({ length: 10, default: 'vi-VN' })
  locale!: string;

  @Column({ length: 60, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ name: 'primary_color', length: 20, default: '#386948' })
  primaryColor!: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({
    name: 'enabled_modules',
    type: 'jsonb',
    default: () =>
      '\'["core","administration","e-office","digital-signature","organization"]\'::jsonb',
  })
  enabledModules!: TenantModuleKey[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  settings!: Record<string, unknown>;

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.tenant)
  memberships!: TenantMembershipEntity[];

  @OneToMany(() => SiteEntity, (site) => site.tenant)
  sites!: SiteEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
