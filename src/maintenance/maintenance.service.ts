import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenancePlanEntity } from '../database/entities';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenancePlanEntity)
    private readonly planRepo: Repository<MaintenancePlanEntity>,
  ) {}

  create(tenantId: string, createDto: CreateMaintenanceDto) {
    const plan = this.planRepo.create({
      ...createDto,
      tenantId,
    });
    return this.planRepo.save(plan);
  }

  findAll(tenantId: string) {
    return this.planRepo.find({
      where: { tenantId },
      relations: ['equipment'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.planRepo.findOne({
      where: { tenantId, id },
      relations: ['equipment'],
    });
    if (!plan) throw new NotFoundException('Maintenance plan not found');
    return plan;
  }

  async update(tenantId: string, id: string, updateDto: UpdateMaintenanceDto) {
    const plan = await this.findOne(tenantId, id);
    Object.assign(plan, updateDto);
    return this.planRepo.save(plan);
  }

  async remove(tenantId: string, id: string) {
    const plan = await this.findOne(tenantId, id);
    await this.planRepo.remove(plan);
    return { success: true };
  }
}
