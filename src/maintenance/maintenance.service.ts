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

  create(createDto: CreateMaintenanceDto) {
    const plan = this.planRepo.create(createDto);
    return this.planRepo.save(plan);
  }

  findAll() {
    return this.planRepo.find({ relations: ['equipment'] });
  }

  async findOne(id: string) {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['equipment'],
    });
    if (!plan) throw new NotFoundException('Maintenance plan not found');
    return plan;
  }

  async update(id: string, updateDto: UpdateMaintenanceDto) {
    const plan = await this.findOne(id);
    Object.assign(plan, updateDto);
    return this.planRepo.save(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    await this.planRepo.remove(plan);
    return { success: true };
  }
}
