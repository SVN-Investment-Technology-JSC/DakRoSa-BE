import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NhanSu } from './nhan-su.entity';

@Entity('tb_NhatKy_ThucHien')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  ma_quy_trinh!: string;

  @ManyToOne(() => NhanSu)
  @JoinColumn({ name: 'ma_nhan_vien', referencedColumnName: 'ma_nhan_vien' })
  nhan_su!: NhanSu;

  @Column({ length: 50 })
  ma_phong_ban_snapshot!: string;

  @Column({ length: 50 })
  ma_chuc_danh_snapshot!: string;

  @Column({ length: 255 })
  hanh_dong!: string;

  @CreateDateColumn()
  thoi_gian!: Date;
}
