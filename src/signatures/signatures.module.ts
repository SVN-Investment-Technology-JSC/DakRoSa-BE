import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { SignatureRequestEntity, SubmissionEntity } from '../database/entities';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignatureRequestEntity, SubmissionEntity]),
    AuditModule,
  ],
  controllers: [SignaturesController],
  providers: [SignaturesService, TenantModuleGuard],
})
export class SignaturesModule {}
