import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkOrderEntity,
  WorkOrderLogEntity,
  WorkOrderStatus,
  WorkOrderMaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
} from '../database/entities';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

@Injectable()
export class WorkOrderService {
  constructor(
    @InjectRepository(WorkOrderEntity)
    private readonly workOrderRepo: Repository<WorkOrderEntity>,
    @InjectRepository(WorkOrderLogEntity)
    private readonly logRepo: Repository<WorkOrderLogEntity>,
    @InjectRepository(WorkOrderMaterialEntity)
    private readonly woMaterialRepo: Repository<WorkOrderMaterialEntity>,
    @InjectRepository(MaterialInventoryEntity)
    private readonly inventoryRepo: Repository<MaterialInventoryEntity>,
    @InjectRepository(InventoryTransactionEntity)
    private readonly transactionRepo: Repository<InventoryTransactionEntity>,
  ) {}

  async create(
    tenantId: string,
    createWorkOrderDto: CreateWorkOrderDto,
    userId?: string,
  ) {
    const exists = await this.workOrderRepo.findOne({
      where: { tenantId, code: createWorkOrderDto.code },
    });
    if (exists)
      throw new ConflictException(
        `Work order ${createWorkOrderDto.code} exists`,
      );

    const wo = this.workOrderRepo.create({
      ...createWorkOrderDto,
      tenantId,
      reporterId: userId,
    });
    const saved = await this.workOrderRepo.save(wo);

    if (userId) {
      await this.logRepo.save({
        tenantId,
        workOrderId: saved.id,
        userId,
        action: 'CREATED',
        note: 'Work order created',
      });
    }

    return saved;
  }

  findAll(tenantId: string) {
    return this.workOrderRepo.find({
      where: { tenantId },
      relations: ['equipment', 'assignee', 'reporter'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const wo = await this.workOrderRepo.findOne({
      where: { tenantId, id },
      relations: ['equipment', 'assignee', 'reporter'],
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return wo;
  }

  async findByEquipment(tenantId: string, equipmentId: string) {
    return this.workOrderRepo.find({
      where: { tenantId, equipmentId },
      order: { createdAt: 'DESC' },
      relations: ['equipment', 'assignee', 'reporter'],
    });
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateWorkOrderDto,
    userId?: string,
  ) {
    const wo = await this.findOne(tenantId, id);

    if (updateDto.status && wo.status !== updateDto.status) {
      if (updateDto.status === WorkOrderStatus.IN_PROGRESS && !wo.startTime) {
        wo.startTime = new Date();
      } else if (
        (updateDto.status === WorkOrderStatus.COMPLETED ||
          updateDto.status === WorkOrderStatus.CLOSED) &&
        !wo.endTime
      ) {
        wo.endTime = new Date();
        if (wo.startTime) {
          const diffMs = wo.endTime.getTime() - wo.startTime.getTime();
          wo.downtimeMinutes = Math.floor(diffMs / 60000);
        }
      }
    }

    Object.assign(wo, updateDto);
    const saved = await this.workOrderRepo.save(wo);

    if (userId) {
      await this.logRepo.save({
        tenantId,
        workOrderId: saved.id,
        userId,
        action: 'UPDATED',
        note: `Status: ${saved.status}`,
      });
    }

    return saved;
  }

  async getMaterials(tenantId: string, id: string) {
    const wo = await this.findOne(tenantId, id);
    return this.woMaterialRepo.find({
      where: { workOrderId: wo.id },
      relations: ['material'],
    });
  }

  async addMaterial(
    tenantId: string,
    id: string,
    materialId: string,
    warehouseId: string,
    quantity: number,
    userId: string,
  ) {
    const wo = await this.findOne(tenantId, id);

    // Check inventory
    const inventory = await this.inventoryRepo.findOne({
      where: { tenantId, materialId, warehouseId },
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new ConflictException('Không đủ số lượng vật tư trong kho');
    }

    // Deduct inventory
    inventory.quantity -= quantity;
    await this.inventoryRepo.save(inventory);

    // Record transaction
    await this.transactionRepo.save({
      tenantId,
      warehouseId,
      materialId,
      type: 'EXPORT',
      quantity,
      referenceId: wo.id,
      note: `Xuất kho cho phiếu công việc ${wo.code}`,
      createdBy: userId,
    });

    let woMat = await this.woMaterialRepo.findOne({
      where: { workOrderId: wo.id, materialId, warehouseId },
    });

    if (woMat) {
      woMat.quantity += quantity;
    } else {
      woMat = this.woMaterialRepo.create({
        workOrderId: wo.id,
        materialId,
        warehouseId,
        quantity,
      });
    }

    return this.woMaterialRepo.save(woMat);
  }

  async removeMaterial(
    tenantId: string,
    id: string,
    materialId: string,
    warehouseId: string,
    userId: string,
  ) {
    const wo = await this.findOne(tenantId, id);
    const woMat = await this.woMaterialRepo.findOne({
      where: { workOrderId: wo.id, materialId, warehouseId },
    });

    if (!woMat) throw new NotFoundException('Material not found in work order');

    // Return to inventory
    const inventory = await this.inventoryRepo.findOne({
      where: { tenantId, materialId, warehouseId },
    });

    if (inventory) {
      inventory.quantity += woMat.quantity;
      await this.inventoryRepo.save(inventory);
    }

    // Record transaction
    await this.transactionRepo.save({
      tenantId,
      warehouseId,
      materialId,
      type: 'IMPORT',
      quantity: woMat.quantity,
      referenceId: wo.id,
      note: `Hoàn trả từ phiếu công việc ${wo.code}`,
      createdBy: userId,
    });

    return this.woMaterialRepo.remove(woMat);
  }

  async getLogs(tenantId: string, id: string) {
    const wo = await this.findOne(tenantId, id);
    return this.logRepo.find({
      where: { tenantId, workOrderId: wo.id },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }
}
