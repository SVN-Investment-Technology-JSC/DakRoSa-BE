import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'personnel' })
@Unique('UQ_personnel_tenant_employee_code', ['tenantId', 'employeeCode'])
export class PersonnelEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) @Index() tenantId!: string;
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant!: TenantEntity;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) @Index() userId!: string | null;
  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'user_id' }) user!: UserEntity | null;
  @Column({ name: 'employee_code', length: 60 }) employeeCode!: string;
  @Column({ name: 'full_name', length: 180 }) fullName!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 254, nullable: true }) email!: string | null;
  @Column({ length: 30, default: 'active' }) status!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
