import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PhongBan } from './phong-ban.entity';
import { ChucDanh } from './chuc-danh.entity';

@Entity('tb_MaTran_RACI')
export class RacıMatrix {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  ma_quy_trinh!: string;

  @ManyToOne(() => PhongBan)
  @JoinColumn({ name: 'ma_phong_ban', referencedColumnName: 'ma_phong_ban' })
  phong_ban!: PhongBan;

  @ManyToOne(() => ChucDanh)
  @JoinColumn({ name: 'ma_chuc_danh', referencedColumnName: 'ma_chuc_danh' })
  chuc_danh!: ChucDanh;

  @Column({ length: 1 })
  vai_tro_raci!: string; // 'R', 'A', 'C', 'I', 'S'
}
