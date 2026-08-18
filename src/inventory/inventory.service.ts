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
  WarehouseLocationEntity,
  MaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
} from '../database/entities';
import { CreateMaterialDto } from './dto/create-material.dto';
import { InventoryTransactionDto } from './dto/inventory-transaction.dto';
import { ReserveMaterialDto } from './dto/reserve-material.dto';
import { CreateWarehouseLocationDto } from './dto/create-warehouse-location.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(WarehouseLocationEntity)
    private readonly locationRepository: Repository<WarehouseLocationEntity>,
    @InjectRepository(MaterialEntity)
    private readonly materialRepository: Repository<MaterialEntity>,
    @InjectRepository(MaterialInventoryEntity)
    private readonly inventoryRepository: Repository<MaterialInventoryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createMaterial(tenantId: string, createMaterialDto: CreateMaterialDto) {
    const exists = await this.materialRepository.findOne({
      where: { tenantId, code: createMaterialDto.code },
    });
    if (exists)
      throw new ConflictException(
        `Material code ${createMaterialDto.code} exists`,
      );

    const material = this.materialRepository.create({
      ...createMaterialDto,
      tenantId,
    });
    return this.materialRepository.save(material);
  }

  async getMaterials(tenantId: string) {
    return this.materialRepository.find({ where: { tenantId } });
  }

  async createLocation(
    tenantId: string,
    warehouseId: string,
    dto: CreateWarehouseLocationDto,
  ) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { tenantId, id: warehouseId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const exists = await this.locationRepository.findOne({
      where: { warehouseId, code: dto.code },
    });
    if (exists)
      throw new ConflictException(`Location code ${dto.code} already exists`);

    const location = this.locationRepository.create({
      ...dto,
      warehouseId,
    });
    return this.locationRepository.save(location);
  }

  async getLocations(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { tenantId, id: warehouseId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    return this.locationRepository.find({
      where: { warehouseId },
      order: { code: 'ASC' },
    });
  }

  async getInventory(tenantId: string, warehouseId?: string) {
    const where = warehouseId ? { tenantId, warehouseId } : { tenantId };
    const items = await this.inventoryRepository.find({
      where,
      relations: ['warehouse', 'material', 'warehouseLocation'],
    });

    return items.map((item) => ({
      ...item,
      quantityAvailable: Math.max(0, item.quantity - item.quantityReserved),
    }));
  }

  async reserveMaterial(
    tenantId: string,
    dto: ReserveMaterialDto,
    userId?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventory = await queryRunner.manager.findOne(
        MaterialInventoryEntity,
        {
          where: {
            tenantId,
            warehouseId: dto.warehouseId,
            materialId: dto.materialId,
            ...(dto.locationId ? { locationId: dto.locationId } : {}),
          },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!inventory) {
        throw new NotFoundException('Material not found in this inventory');
      }

      const available = inventory.quantity - inventory.quantityReserved;
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available quantity to reserve. Available: ${available}, Requested: ${dto.quantity}`,
        );
      }

      inventory.quantityReserved += dto.quantity;
      await queryRunner.manager.save(inventory);

      await queryRunner.commitTransaction();
      return {
        success: true,
        quantityOnHold: inventory.quantity,
        quantityReserved: inventory.quantityReserved,
        quantityAvailable: inventory.quantity - inventory.quantityReserved,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async executeTransaction(
    tenantId: string,
    dto: InventoryTransactionDto,
    userId?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const warehouse = await queryRunner.manager.findOne(WarehouseEntity, {
        where: { tenantId, id: dto.warehouseId },
      });
      if (!warehouse) throw new NotFoundException('Warehouse not found');

      const material = await queryRunner.manager.findOne(MaterialEntity, {
        where: { tenantId, id: dto.materialId },
      });
      if (!material) throw new NotFoundException('Material not found');

      let inventory = await queryRunner.manager.findOne(
        MaterialInventoryEntity,
        {
          where: {
            tenantId,
            warehouseId: dto.warehouseId,
            materialId: dto.materialId,
            ...(dto.locationId ? { locationId: dto.locationId } : {}),
          },
          lock: { mode: 'pessimistic_write' },
        },
      );

      const isOutward =
        dto.type === 'EXPORT' || dto.type === 'OUT' || dto.type === 'BORROW';

      if (!inventory) {
        if (isOutward) {
          throw new BadRequestException('Cannot export from empty inventory');
        }
        inventory = queryRunner.manager.create(MaterialInventoryEntity, {
          tenantId,
          warehouseId: dto.warehouseId,
          materialId: dto.materialId,
          locationId: dto.locationId ?? null,
          quantity: 0,
          quantityReserved: 0,
        });
      }

      if (isOutward) {
        if (inventory.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient quantity. On Hand: ${inventory.quantity}`,
          );
        }
        inventory.quantity -= dto.quantity;
        // Release reservation if this was an issue for Work Order
        if (dto.referenceType === 'WORK_ORDER' && inventory.quantityReserved > 0) {
          inventory.quantityReserved = Math.max(
            0,
            inventory.quantityReserved - dto.quantity,
          );
        }
      } else {
        inventory.quantity += dto.quantity;
      }

      await queryRunner.manager.save(inventory);

      const txCode =
        dto.transactionCode ||
        `${dto.type}-${Date.now().toString().slice(-8)}`;

      const transaction = queryRunner.manager.create(
        InventoryTransactionEntity,
        {
          tenantId,
          transactionCode: txCode,
          warehouseId: dto.warehouseId,
          materialId: dto.materialId,
          type: dto.type,
          quantity: dto.quantity,
          referenceType: dto.referenceType ?? null,
          referenceId: dto.referenceId ?? null,
          workflowRequestId: dto.workflowRequestId ?? null,
          note: dto.note ?? null,
          createdBy: userId,
        },
      );

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        success: true,
        transactionCode: txCode,
        newQuantity: inventory.quantity,
        quantityReserved: inventory.quantityReserved,
        quantityAvailable: Math.max(
          0,
          inventory.quantity - inventory.quantityReserved,
        ),
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getLowStockAlerts(tenantId: string) {
    const qb = this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.material', 'mat')
      .leftJoinAndSelect('inv.warehouse', 'wh')
      .leftJoinAndSelect('inv.warehouseLocation', 'loc')
      .where('inv.tenant_id = :tenantId', { tenantId })
      .andWhere('(inv.quantity - inv.quantity_reserved) <= mat.min_stock');
    return qb.getMany();
  }
}
