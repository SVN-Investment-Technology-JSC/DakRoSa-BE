import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EquipmentEntity,
  EquipmentMeterEntity,
  EquipmentMeterReadingEntity,
} from '../database/entities';
import {
  CreateEquipmentMeterDto,
  CreateMeterReadingDto,
} from './dto/maintenance-platform.dto';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';

@Injectable()
export class EquipmentMeterService {
  constructor(
    @InjectRepository(EquipmentMeterEntity)
    private readonly meters: Repository<EquipmentMeterEntity>,
    @InjectRepository(EquipmentMeterReadingEntity)
    private readonly readings: Repository<EquipmentMeterReadingEntity>,
    @InjectRepository(EquipmentEntity)
    private readonly equipment: Repository<EquipmentEntity>,
    private readonly scheduling: MaintenanceSchedulingService,
  ) {}

  list(tenantId: string, equipmentId?: string) {
    return this.meters.find({
      where: equipmentId ? { tenantId, equipmentId } : { tenantId },
      relations: { equipment: true },
      order: { name: 'ASC' },
    });
  }

  async create(
    tenantId: string,
    dto: CreateEquipmentMeterDto,
  ): Promise<EquipmentMeterEntity> {
    if (
      !(await this.equipment.exists({
        where: { tenantId, id: dto.equipmentId },
      }))
    ) {
      throw new NotFoundException('Equipment not found.');
    }
    const code = dto.code.trim().toUpperCase();
    if (
      await this.meters.exists({
        where: { equipmentId: dto.equipmentId, code },
      })
    ) {
      throw new ConflictException(`Meter code "${code}" already exists.`);
    }
    return this.meters.save(
      this.meters.create({
        tenantId,
        equipmentId: dto.equipmentId,
        code,
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        rolloverValue: dto.rolloverValue ?? null,
        isActive: true,
      }),
    );
  }

  async addReading(
    tenantId: string,
    meterId: string,
    userId: string,
    dto: CreateMeterReadingDto,
  ) {
    const meter = await this.meters.findOne({
      where: { tenantId, id: meterId, isActive: true },
    });
    if (!meter) throw new NotFoundException('Equipment meter not found.');
    if (dto.externalId) {
      const existing = await this.readings.findOne({
        where: { tenantId, externalId: dto.externalId },
      });
      if (existing) return existing;
    }
    const occurredAt = new Date(dto.occurredAt);
    const reading = await this.readings.save(
      this.readings.create({
        tenantId,
        meterId,
        value: dto.value,
        occurredAt,
        source: dto.source?.trim() || 'manual',
        externalId: dto.externalId?.trim() || null,
        createdBy: userId,
      }),
    );
    await this.scheduling.createMeterOccurrence(
      tenantId,
      meter.equipmentId,
      meter.id,
      reading.value,
      reading.occurredAt,
      reading.externalId ?? reading.id,
    );
    return reading;
  }

  async history(tenantId: string, meterId: string) {
    if (!(await this.meters.exists({ where: { tenantId, id: meterId } }))) {
      throw new NotFoundException('Equipment meter not found.');
    }
    return this.readings.find({
      where: { tenantId, meterId },
      order: { occurredAt: 'DESC' },
      take: 500,
    });
  }
}
