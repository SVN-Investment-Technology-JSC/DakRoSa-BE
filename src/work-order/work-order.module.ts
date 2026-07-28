import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';
import {
  WorkOrderEntity,
  WorkOrderLogEntity,
  WorkOrderMaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrderEntity,
      WorkOrderLogEntity,
      WorkOrderMaterialEntity,
      MaterialInventoryEntity,
      InventoryTransactionEntity,
    ]),
  ],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
})
export class WorkOrderModule {}
