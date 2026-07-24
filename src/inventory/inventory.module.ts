import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { WarehouseEntity, MaterialEntity, MaterialInventoryEntity, InventoryTransactionEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseEntity, MaterialEntity, MaterialInventoryEntity, InventoryTransactionEntity])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
