import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentEntity, EquipmentDocumentEntity } from '../database/entities';

import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EquipmentEntity, EquipmentDocumentEntity]),
  ],
  controllers: [EquipmentController],

  providers: [EquipmentService],
})
export class EquipmentModule {}
