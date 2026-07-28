import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentEntity, EquipmentDocumentEntity } from '../database/entities';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,
    @InjectRepository(EquipmentDocumentEntity)
    private readonly equipmentDocumentRepository: Repository<EquipmentDocumentEntity>,
  ) {}

  async create(tenantId: string, createEquipmentDto: CreateEquipmentDto) {
    const exists = await this.equipmentRepository.findOne({
      where: { tenantId, code: createEquipmentDto.code },
    });
    if (exists) {
      throw new ConflictException(
        `Equipment with code ${createEquipmentDto.code} already exists`,
      );
    }

    let parent = null;
    if (createEquipmentDto.parentId) {
      parent = await this.equipmentRepository.findOne({
        where: { tenantId, id: createEquipmentDto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent equipment not found');
    }

    const equipment = this.equipmentRepository.create({
      ...createEquipmentDto,
      parent,
      tenantId,
    });

    return this.equipmentRepository.save(equipment);
  }

  findAll(tenantId: string) {
    return this.equipmentRepository.find({ where: { tenantId }, relations: ['children'] });
  }

  async findTree(tenantId: string) {
    // Basic tree fetch (all roots and their relations)
    const roots = await this.equipmentRepository.find({
      where: { tenantId, parentId: IsNull() },
      relations: ['children'],
    });

    // For nested deeply we would use TreeRepository if we set up @Tree in typeorm,
    // but for simple structures, Adjacency list with relations is fine if depth is low.
    // To recursively load children:
    const loadChildren = async (items: EquipmentEntity[]) => {
      for (const item of items) {
        const fullItem = await this.equipmentRepository.findOne({
          where: { tenantId, id: item.id },
          relations: ['children'],
        });
        if (fullItem && fullItem.children?.length) {
          item.children = fullItem.children;
          await loadChildren(item.children);
        }
      }
    };
    await loadChildren(roots);
    return roots;
  }

  async findOne(tenantId: string, id: string) {
    const equipment = await this.equipmentRepository.findOne({
      where: { tenantId, id },
      relations: ['parent', 'children'],
    });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  async update(tenantId: string, id: string, updateEquipmentDto: UpdateEquipmentDto) {
    const equipment = await this.findOne(tenantId, id);

    if (updateEquipmentDto.code && updateEquipmentDto.code !== equipment.code) {
      const exists = await this.equipmentRepository.findOne({
        where: { tenantId, code: updateEquipmentDto.code },
      });
      if (exists)
        throw new ConflictException(
          `Equipment with code ${updateEquipmentDto.code} already exists`,
        );
    }

    if (updateEquipmentDto.parentId !== undefined) {
      if (updateEquipmentDto.parentId === null) {
        equipment.parent = null;
      } else {
        const parent = await this.equipmentRepository.findOne({
          where: { tenantId, id: updateEquipmentDto.parentId },
        });
        if (!parent) throw new NotFoundException('Parent equipment not found');
        equipment.parent = parent;
      }
    }

    Object.assign(equipment, updateEquipmentDto);
    return this.equipmentRepository.save(equipment);
  }

  async remove(tenantId: string, id: string) {
    const equipment = await this.findOne(tenantId, id);
    await this.equipmentRepository.remove(equipment);
    return { success: true };
  }

  async addDocument(tenantId: string, equipmentId: string, documentData: { name: string; type?: string; fileUrl: string; description?: string }) {
    const equipment = await this.findOne(tenantId, equipmentId);
    const doc = this.equipmentDocumentRepository.create({
      ...documentData,
      equipmentId: equipment.id,
    });
    return this.equipmentDocumentRepository.save(doc);
  }

  async getDocuments(tenantId: string, equipmentId: string) {
    const equipment = await this.findOne(tenantId, equipmentId);
    return this.equipmentDocumentRepository.find({ where: { equipmentId: equipment.id } });
  }

  async removeDocument(tenantId: string, equipmentId: string, docId: string) {
    const equipment = await this.findOne(tenantId, equipmentId);
    const doc = await this.equipmentDocumentRepository.findOne({ where: { id: docId, equipmentId: equipment.id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.equipmentDocumentRepository.remove(doc);
    return { success: true };
  }
}
