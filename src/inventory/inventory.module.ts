import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import {
  WarehouseEntity,
  WarehouseLocationEntity,
  MaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseEntity,
      WarehouseLocationEntity,
      MaterialEntity,
      MaterialInventoryEntity,
      InventoryTransactionEntity,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, TenantModuleGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
