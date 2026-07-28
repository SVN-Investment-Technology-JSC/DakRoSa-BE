import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'equipments' })
export class EquipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;


  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => EquipmentEntity, (equipment) => equipment.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: EquipmentEntity | null;

  @OneToMany(() => EquipmentEntity, (equipment) => equipment.parent)
  children!: EquipmentEntity[];

  @Column({ unique: true, length: 100 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ length: 50, default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'installation_date', type: 'date', nullable: true })
  installationDate!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  specs!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
