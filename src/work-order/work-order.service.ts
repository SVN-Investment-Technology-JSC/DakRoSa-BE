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
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto, userId?: string) {
    const exists = await this.workOrderRepo.findOne({
      where: { code: createWorkOrderDto.code },
    });
    if (exists)
      throw new ConflictException(
        `Work order ${createWorkOrderDto.code} exists`,
      );

    const wo = this.workOrderRepo.create({
      ...createWorkOrderDto,
      reporterId: userId,
    });
    const saved = await this.workOrderRepo.save(wo);

    if (userId) {
      await this.logRepo.save({
        workOrderId: saved.id,
        userId,
        action: 'CREATED',
        note: 'Work order created',
      });
    }

    return saved;
  }

  findAll() {
    return this.workOrderRepo.find({
      relations: ['equipment', 'assignee', 'reporter'],
    });
  }

  async findOne(id: string) {
    const wo = await this.workOrderRepo.findOne({
      where: { id },
      relations: ['equipment', 'assignee', 'reporter'],
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return wo;
  }

  async update(id: string, updateDto: UpdateWorkOrderDto, userId?: string) {
    const wo = await this.findOne(id);

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
        workOrderId: saved.id,
        userId,
        action: 'UPDATED',
        note: `Status: ${saved.status}`,
      });
    }

    return saved;
  }
}
