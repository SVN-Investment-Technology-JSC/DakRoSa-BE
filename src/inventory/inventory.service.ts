import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  WarehouseEntity,
  MaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
} from '../database/entities';
import { CreateMaterialDto } from './dto/create-material.dto';
import { InventoryTransactionDto } from './dto/inventory-transaction.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(MaterialEntity)
    private readonly materialRepository: Repository<MaterialEntity>,
    @InjectRepository(MaterialInventoryEntity)
    private readonly inventoryRepository: Repository<MaterialInventoryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createMaterial(createMaterialDto: CreateMaterialDto) {
    const exists = await this.materialRepository.findOne({
      where: { code: createMaterialDto.code },
    });
    if (exists)
      throw new ConflictException(
        `Material code ${createMaterialDto.code} exists`,
      );

    const material = this.materialRepository.create(createMaterialDto);
    return this.materialRepository.save(material);
  }

  async getMaterials() {
    return this.materialRepository.find();
  }

  async getInventory(warehouseId?: string) {
    const where = warehouseId ? { warehouseId } : {};
    return this.inventoryRepository.find({
      where,
      relations: ['warehouse', 'material'],
    });
  }

  async executeTransaction(dto: InventoryTransactionDto, userId?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const warehouse = await queryRunner.manager.findOne(WarehouseEntity, {
        where: { id: dto.warehouseId },
      });
      if (!warehouse) throw new NotFoundException('Warehouse not found');

      const material = await queryRunner.manager.findOne(MaterialEntity, {
        where: { id: dto.materialId },
      });
      if (!material) throw new NotFoundException('Material not found');

      let inventory = await queryRunner.manager.findOne(
        MaterialInventoryEntity,
        {
          where: { warehouseId: dto.warehouseId, materialId: dto.materialId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!inventory) {
        if (dto.type === 'EXPORT') {
          throw new BadRequestException('Cannot export from empty inventory');
        }
        inventory = queryRunner.manager.create(MaterialInventoryEntity, {
          warehouseId: dto.warehouseId,
          materialId: dto.materialId,
          quantity: 0,
        });
      }

      if (dto.type === 'EXPORT') {
        if (inventory.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient quantity. Available: ${inventory.quantity}`,
          );
        }
        inventory.quantity -= dto.quantity;
      } else {
        inventory.quantity += dto.quantity;
      }

      await queryRunner.manager.save(inventory);

      const transaction = queryRunner.manager.create(
        InventoryTransactionEntity,
        {
          warehouseId: dto.warehouseId,
          materialId: dto.materialId,
          type: dto.type,
          quantity: dto.quantity,
          referenceId: dto.referenceId,
          note: dto.note,
          createdBy: userId,
        },
      );

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return { success: true, newQuantity: inventory.quantity };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getLowStockAlerts() {
    const qb = this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.material', 'mat')
      .leftJoinAndSelect('inv.warehouse', 'wh')
      .where('inv.quantity <= mat.min_stock');
    return qb.getMany();
  }
}
