import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EquipmentEntity } from './equipment.entity';
import { EquipmentGroupEntity } from './equipment-group.entity';

@Entity({ name: 'equipment_group_members' })
@Unique('UQ_equipment_group_members_group_equipment', [
  'groupId',
  'equipmentId',
])
export class EquipmentGroupMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  @Index()
  groupId!: string;

  @ManyToOne(() => EquipmentGroupEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group!: EquipmentGroupEntity;

  @Column({ name: 'equipment_id', type: 'uuid' })
  @Index()
  equipmentId!: string;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: EquipmentEntity;
}
