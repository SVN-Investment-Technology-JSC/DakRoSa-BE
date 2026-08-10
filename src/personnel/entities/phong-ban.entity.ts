
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { DonVi } from './don-vi.entity';

@Entity('tb_PhongBan')
export class PhongBan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  ma_phong_ban!: string;

  @Column()
  don_vi_id!: number;

  @ManyToOne(() => DonVi)
  don_vi!: DonVi;

  @Column({ length: 255 })
  ten_phong_ban!: string;

  @Column({ length: 50 })
  loai_phong_ban!: string; // Enum: Phong, Ban, To, Doi, Nhom
}
