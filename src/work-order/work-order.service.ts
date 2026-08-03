import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  EquipmentEntity,
  InventoryTransactionEntity,
  MaintenanceJobPlanStepEntity,
  MaintenanceJobPlanVersionEntity,
  MaintenanceOccurrenceEntity,
  MaintenanceScheduleEntity,
  MaterialInventoryEntity,
  SiteEntity,
  TenantEntity,
  TenantMembershipEntity,
  WorkOrderChecklistResultEntity,
  WorkOrderEntity,
  WorkOrderLogEntity,
  WorkOrderMaterialEntity,
  WorkOrderStatus,
  WorkOrderType,
  WorkOrderUpdateEntity,
  WorkflowDefinitionEntity,
} from '../database/entities';
import { WorkflowActionDto } from '../workflow/dto/workflow-definition.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  CreateWorkOrderUpdateDto,
  UpdateWorkOrderChecklistDto,
} from './dto/work-order-progress.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';

interface ResolvedWorkOrderContext {
  workflow: WorkflowDefinitionEntity;
  schedule: MaintenanceScheduleEntity | null;
  occurrence: MaintenanceOccurrenceEntity | null;
  jobPlanVersionId: string | null;
  assigneeId: string | null;
  technicalReviewerId: string | null;
  siteId: string | null;
}

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workflow: WorkflowService,
    @InjectRepository(WorkOrderEntity)
    private readonly workOrders: Repository<WorkOrderEntity>,
    @InjectRepository(WorkOrderLogEntity)
    private readonly logs: Repository<WorkOrderLogEntity>,
    @InjectRepository(WorkOrderMaterialEntity)
    private readonly workOrderMaterials: Repository<WorkOrderMaterialEntity>,
    @InjectRepository(MaterialInventoryEntity)
    private readonly inventory: Repository<MaterialInventoryEntity>,
    @InjectRepository(InventoryTransactionEntity)
    private readonly transactions: Repository<InventoryTransactionEntity>,
    @InjectRepository(EquipmentEntity)
    private readonly equipment: Repository<EquipmentEntity>,
    @InjectRepository(SiteEntity)
    private readonly sites: Repository<SiteEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly memberships: Repository<TenantMembershipEntity>,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly workflowDefinitions: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(MaintenanceScheduleEntity)
    private readonly schedules: Repository<MaintenanceScheduleEntity>,
    @InjectRepository(MaintenanceOccurrenceEntity)
    private readonly occurrences: Repository<MaintenanceOccurrenceEntity>,
    @InjectRepository(MaintenanceJobPlanVersionEntity)
    private readonly jobPlanVersions: Repository<MaintenanceJobPlanVersionEntity>,
    @InjectRepository(MaintenanceJobPlanStepEntity)
    private readonly jobPlanSteps: Repository<MaintenanceJobPlanStepEntity>,
    @InjectRepository(WorkOrderUpdateEntity)
    private readonly updates: Repository<WorkOrderUpdateEntity>,
    @InjectRepository(WorkOrderChecklistResultEntity)
    private readonly checklistResults: Repository<WorkOrderChecklistResultEntity>,
  ) {}

  async create(
    tenantId: string,
    dto: CreateWorkOrderDto,
    userId?: string,
    tenantSlug?: string,
  ) {
    const code = dto.code.trim().toUpperCase();
    if (await this.workOrders.exists({ where: { tenantId, code } })) {
      throw new ConflictException(`Work order ${code} exists`);
    }
    const context = await this.resolveContext(tenantId, dto);
    if (dto.equipmentId) {
      const equipment = await this.requireEquipment(tenantId, dto.equipmentId);
      if (
        context.siteId &&
        equipment.siteId &&
        equipment.siteId !== context.siteId
      ) {
        throw new BadRequestException('Thiết bị không thuộc nhà máy đã chọn.');
      }
      context.siteId ??= equipment.siteId;
    }
    if (
      context.siteId &&
      !(await this.sites.exists({ where: { tenantId, id: context.siteId } }))
    ) {
      throw new BadRequestException('Nhà máy không hợp lệ.');
    }
    await this.assertActiveUsers(
      tenantId,
      [context.assigneeId, context.technicalReviewerId].filter(
        (value): value is string => Boolean(value),
      ),
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(WorkOrderEntity);
      const workOrder = await repo.save(
        repo.create({
          tenantId,
          code,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          status: context.assigneeId
            ? WorkOrderStatus.ASSIGNED
            : (dto.status ?? WorkOrderStatus.DRAFT),
          priority: dto.priority ?? 'NORMAL',
          equipmentId:
            dto.equipmentId ?? context.occurrence?.equipmentId ?? null,
          siteId: context.siteId,
          reporterId: userId ?? null,
          assigneeId: context.assigneeId,
          startTime: null,
          endTime: null,
          plannedStartAt: dto.plannedStartAt
            ? new Date(dto.plannedStartAt)
            : (context.occurrence?.plannedStartAt ?? null),
          dueAt: dto.dueAt
            ? new Date(dto.dueAt)
            : (context.occurrence?.dueAt ?? null),
          progressPercent: 0,
          downtimeMinutes: 0,
          rootCause: null,
          maintenanceScheduleId: context.schedule?.id ?? null,
          maintenanceOccurrenceId: context.occurrence?.id ?? null,
          jobPlanVersionId: context.jobPlanVersionId,
          workflowInstanceId: null,
          customFields: dto.customFields ?? {},
          attachments: null,
        }),
      );
      if (userId) {
        await manager.getRepository(WorkOrderLogEntity).save({
          tenantId,
          workOrderId: workOrder.id,
          userId,
          action: 'CREATED',
          note: 'Work order created',
        });
      }
      if (context.jobPlanVersionId) {
        const steps = await manager
          .getRepository(MaintenanceJobPlanStepEntity)
          .find({ where: { versionId: context.jobPlanVersionId } });
        if (steps.length) {
          await manager.getRepository(WorkOrderChecklistResultEntity).save(
            steps.map((step) => ({
              workOrderId: workOrder.id,
              stepId: step.id,
              status: 'pending',
              value: {},
              note: null,
              completedBy: null,
              completedAt: null,
            })),
          );
        }
      }
      if (context.occurrence) {
        context.occurrence.status = 'generated';
        context.occurrence.workOrderId = workOrder.id;
        await manager
          .getRepository(MaintenanceOccurrenceEntity)
          .save(context.occurrence);
      }
      return workOrder;
    });

    const instance = await this.workflow.startInstance({
      tenantId,
      definitionId: context.workflow.id,
      resourceType: 'maintenance_work_order',
      resourceId: saved.id,
      actorId: userId ?? null,
      context: {
        createdBy: userId ?? context.schedule?.createdBy,
        tenantSlug,
        assigneeId: context.assigneeId,
        technicalReviewerId: context.technicalReviewerId,
        priority: saved.priority,
        equipmentId: saved.equipmentId,
        siteId: saved.siteId,
        customFields: saved.customFields,
      },
    });
    saved.workflowInstanceId = instance.id;
    return this.workOrders.save(saved);
  }

  findAll(tenantId: string) {
    return this.workOrders.find({
      where: { tenantId },
      relations: ['equipment', 'site', 'assignee', 'reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string, user?: AuthUser) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    const [updates, checklist, workflow] = await Promise.all([
      this.updates.find({
        where: { tenantId, workOrderId: id },
        relations: { actor: true },
        order: { createdAt: 'DESC' },
      }),
      this.checklistResults.find({
        where: { workOrderId: id },
        relations: { step: true, completer: true },
        order: { step: { sortOrder: 'ASC' } },
      }),
      workOrder.workflowInstanceId
        ? this.workflow.getInstance(
            tenantId,
            workOrder.workflowInstanceId,
            user,
          )
        : Promise.resolve(null),
    ]);
    return { ...workOrder, updates, checklist, workflow };
  }

  async findByEquipment(tenantId: string, equipmentId: string) {
    await this.requireEquipment(tenantId, equipmentId);
    return this.workOrders.find({
      where: { tenantId, equipmentId },
      order: { createdAt: 'DESC' },
      relations: ['equipment', 'site', 'assignee', 'reporter'],
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWorkOrderDto,
    userId?: string,
  ) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    if (
      dto.status &&
      dto.status !== workOrder.status &&
      workOrder.workflowInstanceId
    ) {
      throw new BadRequestException(
        'Trạng thái phải được thay đổi bằng hành động của quy trình.',
      );
    }
    if (dto.equipmentId) await this.requireEquipment(tenantId, dto.equipmentId);
    if (dto.assigneeId) {
      await this.assertActiveUsers(tenantId, [dto.assigneeId]);
    }
    if (dto.status && workOrder.status !== dto.status) {
      if (dto.status === WorkOrderStatus.IN_PROGRESS && !workOrder.startTime) {
        workOrder.startTime = new Date();
      } else if (
        [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED].includes(
          dto.status,
        ) &&
        !workOrder.endTime
      ) {
        workOrder.endTime = new Date();
        if (workOrder.startTime) {
          workOrder.downtimeMinutes = Math.floor(
            (workOrder.endTime.getTime() - workOrder.startTime.getTime()) /
              60_000,
          );
        }
      }
    }
    Object.assign(workOrder, dto);
    const saved = await this.workOrders.save(workOrder);
    if (
      saved.maintenanceOccurrenceId &&
      [
        WorkOrderStatus.COMPLETED,
        WorkOrderStatus.CLOSED,
        WorkOrderStatus.CANCELLED,
      ].includes(saved.status)
    ) {
      await this.occurrences.update(
        { tenantId, id: saved.maintenanceOccurrenceId },
        {
          status:
            saved.status === WorkOrderStatus.CANCELLED
              ? 'cancelled'
              : 'completed',
        },
      );
    }
    if (userId) {
      await this.logs.save({
        tenantId,
        workOrderId: saved.id,
        userId,
        action: 'UPDATED',
        note: `Status: ${saved.status}`,
      });
    }
    return saved;
  }

  async performWorkflowAction(
    tenantId: string,
    id: string,
    user: AuthUser,
    dto: WorkflowActionDto,
  ) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    if (!workOrder.workflowInstanceId) {
      throw new BadRequestException('Phiếu chưa được gắn với quy trình.');
    }
    const instance = await this.workflow.performAction(
      tenantId,
      workOrder.workflowInstanceId,
      user,
      dto,
    );
    if (instance.status === 'completed') {
      workOrder.status = WorkOrderStatus.COMPLETED;
      workOrder.progressPercent = 100;
      workOrder.endTime ??= new Date();
      if (workOrder.maintenanceOccurrenceId) {
        await this.occurrences.update(
          { tenantId, id: workOrder.maintenanceOccurrenceId },
          { status: 'completed' },
        );
      }
    } else if (dto.actionKey === 'assign') {
      workOrder.status = WorkOrderStatus.ASSIGNED;
    } else {
      workOrder.status = WorkOrderStatus.IN_PROGRESS;
      workOrder.startTime ??= new Date();
    }
    await this.workOrders.save(workOrder);
    await this.logs.save({
      tenantId,
      workOrderId: id,
      userId: user.id,
      action: `WORKFLOW_${dto.actionKey.toUpperCase()}`,
      note: dto.note?.trim() || dto.actionKey,
    });
    return this.findOne(tenantId, id, user);
  }

  async addUpdate(
    tenantId: string,
    id: string,
    userId: string,
    dto: CreateWorkOrderUpdateDto,
  ) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    const update = await this.updates.save(
      this.updates.create({
        tenantId,
        workOrderId: id,
        actorId: userId,
        type: dto.type,
        progressPercent: dto.progressPercent ?? null,
        note: dto.note.trim(),
        payload: dto.payload ?? {},
      }),
    );
    if (dto.progressPercent !== undefined) {
      workOrder.progressPercent = dto.progressPercent;
      if (
        dto.progressPercent > 0 &&
        workOrder.status === WorkOrderStatus.ASSIGNED
      ) {
        workOrder.status = WorkOrderStatus.IN_PROGRESS;
        workOrder.startTime ??= new Date();
      }
      await this.workOrders.save(workOrder);
    }
    return update;
  }

  async getUpdates(tenantId: string, id: string) {
    await this.requireWorkOrder(tenantId, id);
    return this.updates.find({
      where: { tenantId, workOrderId: id },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getChecklist(tenantId: string, id: string) {
    await this.requireWorkOrder(tenantId, id);
    return this.checklistResults.find({
      where: { workOrderId: id },
      relations: { step: true, completer: true },
      order: { step: { sortOrder: 'ASC' } },
    });
  }

  async updateChecklist(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateWorkOrderChecklistDto,
  ) {
    await this.requireWorkOrder(tenantId, id);
    const result = await this.checklistResults.findOne({
      where: { workOrderId: id, stepId: dto.stepId },
    });
    if (!result) throw new NotFoundException('Checklist step not found.');
    result.status = dto.status;
    result.value = dto.value;
    result.note = dto.note?.trim() || null;
    result.completedBy = dto.status === 'pending' ? null : userId;
    result.completedAt = dto.status === 'pending' ? null : new Date();
    return this.checklistResults.save(result);
  }

  async generateDueOccurrences(tenantId?: string) {
    const builder = this.occurrences
      .createQueryBuilder('occurrence')
      .innerJoinAndSelect('occurrence.schedule', 'schedule')
      .leftJoinAndSelect('occurrence.equipment', 'equipment')
      .where('occurrence.status = :status', { status: 'planned' })
      .andWhere('schedule.status = :scheduleStatus', {
        scheduleStatus: 'active',
      })
      .andWhere('occurrence.planned_start_at <= :horizon', {
        horizon: new Date(Date.now() + 24 * 60 * 60_000),
      });
    if (tenantId) {
      builder.andWhere('occurrence.tenant_id = :tenantId', { tenantId });
    }
    const occurrences = await builder
      .orderBy('occurrence.plannedStartAt', 'ASC')
      .take(200)
      .getMany();
    const tenantSlugs = new Map(
      (
        await this.tenants.findBy({
          id: In([...new Set(occurrences.map((item) => item.tenantId))]),
        })
      ).map((tenant) => [tenant.id, tenant.slug]),
    );
    let created = 0;
    for (const occurrence of occurrences) {
      const code = `PM-${occurrence.plannedStartAt
        .toISOString()
        .slice(0, 10)
        .replaceAll('-', '')}-${occurrence.id.slice(0, 8).toUpperCase()}`;
      if (
        await this.workOrders.exists({
          where: { tenantId: occurrence.tenantId, code },
        })
      ) {
        occurrence.status = 'generated';
        await this.occurrences.save(occurrence);
        continue;
      }
      await this.create(
        occurrence.tenantId,
        {
          code,
          title: occurrence.schedule.name,
          description: occurrence.schedule.description ?? undefined,
          type: WorkOrderType.MAINTENANCE,
          priority: 'NORMAL',
          equipmentId: occurrence.equipmentId ?? undefined,
          siteId: occurrence.schedule.siteId ?? undefined,
          maintenanceScheduleId: occurrence.scheduleId,
          maintenanceOccurrenceId: occurrence.id,
          assigneeId: occurrence.schedule.defaultAssigneeId ?? undefined,
          technicalReviewerId:
            occurrence.schedule.defaultTechnicalReviewerId ?? undefined,
          plannedStartAt: occurrence.plannedStartAt.toISOString(),
          dueAt: occurrence.dueAt?.toISOString(),
        },
        occurrence.schedule.createdBy ?? undefined,
        tenantSlugs.get(occurrence.tenantId),
      );
      created += 1;
    }
    return { created };
  }

  async getMaterials(tenantId: string, id: string) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    return this.workOrderMaterials.find({
      where: { workOrderId: workOrder.id },
      relations: ['material', 'warehouse'],
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
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }
    const workOrder = await this.requireWorkOrder(tenantId, id);
    return this.dataSource.transaction(async (manager) => {
      const inventoryRepo = manager.getRepository(MaterialInventoryEntity);
      const inventory = await inventoryRepo
        .createQueryBuilder('inventory')
        .setLock('pessimistic_write')
        .where('inventory.tenant_id = :tenantId', { tenantId })
        .andWhere('inventory.material_id = :materialId', { materialId })
        .andWhere('inventory.warehouse_id = :warehouseId', { warehouseId })
        .getOne();
      if (!inventory || inventory.quantity < quantity) {
        throw new ConflictException('Không đủ số lượng vật tư trong kho.');
      }
      inventory.quantity -= quantity;
      await inventoryRepo.save(inventory);
      await manager.getRepository(InventoryTransactionEntity).save({
        tenantId,
        warehouseId,
        materialId,
        type: 'EXPORT',
        quantity,
        referenceId: workOrder.id,
        note: `Xuất kho cho phiếu công việc ${workOrder.code}`,
        createdBy: userId,
      });
      const materialRepo = manager.getRepository(WorkOrderMaterialEntity);
      let material = await materialRepo.findOne({
        where: { workOrderId: workOrder.id, materialId, warehouseId },
      });
      if (material) material.quantity += quantity;
      else {
        material = materialRepo.create({
          workOrderId: workOrder.id,
          materialId,
          warehouseId,
          quantity,
        });
      }
      return materialRepo.save(material);
    });
  }

  async removeMaterial(
    tenantId: string,
    id: string,
    materialId: string,
    warehouseId: string,
    userId: string,
  ) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    return this.dataSource.transaction(async (manager) => {
      const materialRepo = manager.getRepository(WorkOrderMaterialEntity);
      const material = await materialRepo.findOne({
        where: { workOrderId: workOrder.id, materialId, warehouseId },
      });
      if (!material) {
        throw new NotFoundException('Material not found in work order');
      }
      const inventoryRepo = manager.getRepository(MaterialInventoryEntity);
      const inventory = await inventoryRepo.findOne({
        where: { tenantId, materialId, warehouseId },
      });
      if (inventory) {
        inventory.quantity += material.quantity;
        await inventoryRepo.save(inventory);
      }
      await manager.getRepository(InventoryTransactionEntity).save({
        tenantId,
        warehouseId,
        materialId,
        type: 'IMPORT',
        quantity: material.quantity,
        referenceId: workOrder.id,
        note: `Hoàn trả từ phiếu công việc ${workOrder.code}`,
        createdBy: userId,
      });
      await materialRepo.remove(material);
      return { success: true };
    });
  }

  async getLogs(tenantId: string, id: string) {
    const workOrder = await this.requireWorkOrder(tenantId, id);
    return this.logs.find({
      where: { tenantId, workOrderId: workOrder.id },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  private async resolveContext(
    tenantId: string,
    dto: CreateWorkOrderDto,
  ): Promise<ResolvedWorkOrderContext> {
    const occurrence = dto.maintenanceOccurrenceId
      ? await this.occurrences.findOne({
          where: { tenantId, id: dto.maintenanceOccurrenceId },
          relations: { schedule: true },
        })
      : null;
    if (dto.maintenanceOccurrenceId && !occurrence) {
      throw new BadRequestException('Maintenance occurrence is invalid.');
    }
    const scheduleId =
      dto.maintenanceScheduleId ?? occurrence?.scheduleId ?? null;
    const schedule = scheduleId
      ? await this.schedules.findOne({
          where: { tenantId, id: scheduleId },
        })
      : null;
    if (scheduleId && !schedule) {
      throw new BadRequestException('Maintenance schedule is invalid.');
    }
    const workflowId =
      dto.workflowDefinitionId ?? schedule?.workflowDefinitionId;
    const workflow = workflowId
      ? await this.workflowDefinitions.findOne({
          where: { tenantId, id: workflowId, status: 'published' },
        })
      : await this.workflowDefinitions.findOne({
          where: {
            tenantId,
            key: 'maintenance-standard',
            status: 'published',
          },
        });
    if (!workflow?.currentVersionId) {
      throw new BadRequestException(
        'Tenant chưa có quy trình bảo trì được công bố.',
      );
    }
    let jobPlanVersionId = dto.jobPlanVersionId ?? null;
    if (!jobPlanVersionId && schedule) {
      const plan = await this.schedules
        .createQueryBuilder('schedule')
        .innerJoinAndSelect('schedule.jobPlan', 'jobPlan')
        .where('schedule.id = :id', { id: schedule.id })
        .andWhere('schedule.tenant_id = :tenantId', { tenantId })
        .getOne();
      jobPlanVersionId = plan?.jobPlan.currentVersionId ?? null;
    }
    if (jobPlanVersionId) {
      const validVersion = await this.jobPlanVersions
        .createQueryBuilder('version')
        .innerJoin('version.jobPlan', 'jobPlan')
        .where('version.id = :jobPlanVersionId', { jobPlanVersionId })
        .andWhere('jobPlan.tenant_id = :tenantId', { tenantId })
        .getExists();
      if (!validVersion) {
        throw new BadRequestException('Job plan version is invalid.');
      }
    }
    return {
      workflow,
      schedule,
      occurrence,
      jobPlanVersionId,
      assigneeId: dto.assigneeId ?? schedule?.defaultAssigneeId ?? null,
      technicalReviewerId:
        dto.technicalReviewerId ?? schedule?.defaultTechnicalReviewerId ?? null,
      siteId: dto.siteId ?? schedule?.siteId ?? null,
    };
  }

  private async requireWorkOrder(tenantId: string, id: string) {
    const workOrder = await this.workOrders.findOne({
      where: { tenantId, id },
      relations: ['equipment', 'site', 'assignee', 'reporter'],
    });
    if (!workOrder) throw new NotFoundException('Work order not found');
    return workOrder;
  }

  private async requireEquipment(tenantId: string, id: string) {
    const equipment = await this.equipment.findOne({
      where: { tenantId, id },
    });
    if (!equipment) throw new BadRequestException('Equipment is invalid.');
    return equipment;
  }

  private async assertActiveUsers(tenantId: string, userIds: string[]) {
    const unique = [...new Set(userIds)];
    if (!unique.length) return;
    const count = await this.memberships.count({
      where: { tenantId, userId: In(unique), status: 'active' },
    });
    if (count !== unique.length) {
      throw new BadRequestException(
        'Người thực hiện hoặc người kiểm tra không thuộc tenant.',
      );
    }
  }
}
