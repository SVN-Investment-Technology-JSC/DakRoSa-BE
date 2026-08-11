import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_ChucDanh')
export class ChucDanh {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  ma_chuc_danh!: string;

  @Column({ length: 255 })
  ten_chuc_danh!: string;
}
