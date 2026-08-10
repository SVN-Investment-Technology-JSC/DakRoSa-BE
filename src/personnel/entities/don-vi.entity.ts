
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity('tb_DonVi')
export class DonVi {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  ma_don_vi!: string;

  @Column({ type: 'integer', nullable: true })
  parent_id!: number | null;

  @ManyToOne(() => DonVi, donVi => donVi.children)
  parent!: DonVi | null;

  @OneToMany(() => DonVi, donVi => donVi.parent)
  children!: DonVi[];

  @Column({ length: 255 })
  ten_don_vi!: string;

  @Column({ length: 50 })
  loai_don_vi!: string; // Enum: TongCongTy, Khoi, ChiNhanh
}
