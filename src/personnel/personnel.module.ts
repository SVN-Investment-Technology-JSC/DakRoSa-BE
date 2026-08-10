import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';
import { DonVi } from './entities/don-vi.entity';
import { PhongBan } from './entities/phong-ban.entity';
import { ChucDanh } from './entities/chuc-danh.entity';
import { NhanSu } from './entities/nhan-su.entity';
import { RacıMatrix } from './entities/raci-matrix.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DonVi,
      PhongBan,
      ChucDanh,
      NhanSu,
      RacıMatrix,
      AuditLog,
    ]),
  ],
  controllers: [PersonnelController],
  providers: [PersonnelService],
})
export class PersonnelModule {}
