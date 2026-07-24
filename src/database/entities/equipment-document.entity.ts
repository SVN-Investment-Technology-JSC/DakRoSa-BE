import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EquipmentEntity } from './equipment.entity';

@Entity({ name: 'equipment_documents' })
export class EquipmentDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId!: string;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: EquipmentEntity;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type!: string | null;

  @Column({ name: 'file_url', length: 500 })
  fileUrl!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
