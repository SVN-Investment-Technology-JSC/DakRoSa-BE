import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { OrganizationUnitEntity } from './organization-unit.entity';
import { PersonnelEntity } from './personnel.entity';
import { PositionEntity } from './position.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'personnel_assignments' })
@Unique('UQ_personnel_assignment_active_position', ['personnelId', 'organizationUnitId', 'positionId', 'endDate'])
export class PersonnelAssignmentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) @Index() tenantId!: string;
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant!: TenantEntity;
  @Column({ name: 'personnel_id', type: 'uuid' }) @Index() personnelId!: string;
  @ManyToOne(() => PersonnelEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'personnel_id' }) personnel!: PersonnelEntity;
  @Column({ name: 'organization_unit_id', type: 'uuid' }) @Index() organizationUnitId!: string;
  @ManyToOne(() => OrganizationUnitEntity, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'organization_unit_id' }) organizationUnit!: OrganizationUnitEntity;
  @Column({ name: 'position_id', type: 'uuid' }) @Index() positionId!: string;
  @ManyToOne(() => PositionEntity, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'position_id' }) position!: PositionEntity;
  @Column({ name: 'is_primary', default: false }) isPrimary!: boolean;
  @Column({ type: 'smallint', default: 3 }) rank!: number;
  @Column({ name: 'start_date', type: 'date' }) startDate!: string;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
