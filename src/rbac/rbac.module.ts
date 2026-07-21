import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PermissionEntity, RoleEntity } from '../database/entities';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
    AuditModule,
  ],
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}
