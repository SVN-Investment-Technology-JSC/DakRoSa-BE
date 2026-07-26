import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import {
  SubmissionActionEntity,
  SubmissionEntity,
  TenantMembershipEntity,
} from '../database/entities';
import { EOfficeController } from './e-office.controller';
import { EOfficeService } from './e-office.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubmissionEntity,
      SubmissionActionEntity,
      TenantMembershipEntity,
    ]),
    AuditModule,
  ],
  controllers: [EOfficeController],
  providers: [EOfficeService, TenantModuleGuard],
  exports: [EOfficeService],
})
export class EOfficeModule {}
