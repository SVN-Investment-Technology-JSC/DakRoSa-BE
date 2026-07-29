import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../database/entities';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController],
  providers: [AuditService, TenantModuleGuard],
  exports: [AuditService],
})
export class AuditModule {}
