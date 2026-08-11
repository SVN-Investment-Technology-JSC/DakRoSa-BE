import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PhongBan } from './phong-ban.entity';
import { ChucDanh } from './chuc-danh.entity';

@Entity('tb_NhanSu')
export class NhanSu {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  ma_nhan_vien!: string;

  @ManyToOne(() => PhongBan)
  @JoinColumn({ name: 'ma_phong_ban', referencedColumnName: 'ma_phong_ban' })
  phong_ban!: PhongBan;

  @ManyToOne(() => ChucDanh)
  @JoinColumn({ name: 'ma_chuc_danh', referencedColumnName: 'ma_chuc_danh' })
  chuc_danh!: ChucDanh;

  @Column({ length: 255 })
  ho_ten!: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email!: string | null;

  @Column({ default: 'Active' })
  trang_thai!: string; // Enum: Active, Inactive
}
