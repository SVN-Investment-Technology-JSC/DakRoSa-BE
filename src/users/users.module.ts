import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import {
  AuthSessionEntity,
  OrganizationUnitEntity,
  PositionEntity,
  RoleEntity,
  TenantMembershipEntity,
  UserEntity,
} from '../database/entities';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      AuthSessionEntity,
      TenantMembershipEntity,
      OrganizationUnitEntity,
      PositionEntity,
    ]),
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
