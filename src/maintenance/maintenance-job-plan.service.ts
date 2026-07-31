import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  MaintenanceJobPlanEntity,
  MaintenanceJobPlanStepEntity,
  MaintenanceJobPlanVersionEntity,
} from '../database/entities';
import {
  CreateMaintenanceJobPlanDto,
  MaintenanceJobPlanStepInputDto,
  SaveMaintenanceJobPlanDraftDto,
} from './dto/maintenance-platform.dto';

@Injectable()
export class MaintenanceJobPlanService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MaintenanceJobPlanEntity)
    private readonly plans: Repository<MaintenanceJobPlanEntity>,
    @InjectRepository(MaintenanceJobPlanVersionEntity)
    private readonly versions: Repository<MaintenanceJobPlanVersionEntity>,
    @InjectRepository(MaintenanceJobPlanStepEntity)
    private readonly steps: Repository<MaintenanceJobPlanStepEntity>,
  ) {}

  async list(tenantId: string) {
    const plans = await this.plans.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
    });
    const ids = plans.map((plan) => plan.id);
    const versions = ids.length
      ? await this.versions.find({
          where: { jobPlanId: In(ids) },
          order: { versionNumber: 'DESC' },
        })
      : [];
    return plans.map((plan) => ({
      ...plan,
      versions: versions.filter((version) => version.jobPlanId === plan.id),
    }));
  }

  async get(tenantId: string, id: string) {
    const plan = await this.requirePlan(tenantId, id);
    const versions = await this.versions.find({
      where: { jobPlanId: id },
      order: { versionNumber: 'DESC' },
    });
    const selected =
      versions.find((version) => version.status === 'draft') ??
      versions.find((version) => version.id === plan.currentVersionId) ??
      versions[0];
    return {
      ...plan,
      versions,
      selectedVersion: selected
        ? {
            ...selected,
            steps: await this.steps.find({
              where: { versionId: selected.id },
              order: { sortOrder: 'ASC' },
            }),
          }
        : null,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateMaintenanceJobPlanDto,
  ) {
    if (!dto.steps.length) {
      throw new BadRequestException('Mẫu công việc cần ít nhất một bước.');
    }
    this.assertUniqueStepKeys(dto.steps);
    return this.dataSource.transaction(async (manager) => {
      const planRepo = manager.getRepository(MaintenanceJobPlanEntity);
      const code = dto.code.trim().toUpperCase();
      if (await planRepo.exists({ where: { tenantId, code } })) {
        throw new ConflictException(`Job plan code "${code}" already exists.`);
      }
      const plan = await planRepo.save(
        planRepo.create({
          tenantId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || null,
          status: 'draft',
          currentVersionId: null,
          createdBy: userId,
        }),
      );
      const version = await manager
        .getRepository(MaintenanceJobPlanVersionEntity)
        .save({
          jobPlanId: plan.id,
          versionNumber: 1,
          status: 'draft',
          estimatedMinutes: dto.estimatedMinutes ?? null,
          requiredSkills: dto.requiredSkills ?? [],
          customFields: {},
          publishedBy: null,
          publishedAt: null,
        });
      await this.replaceSteps(manager, version.id, dto.steps);
      return this.getWithManager(manager, tenantId, plan.id);
    });
  }

  async saveDraft(
    tenantId: string,
    id: string,
    dto: SaveMaintenanceJobPlanDraftDto,
  ) {
    if (!dto.steps.length) {
      throw new BadRequestException('Mẫu công việc cần ít nhất một bước.');
    }
    this.assertUniqueStepKeys(dto.steps);
    return this.dataSource.transaction(async (manager) => {
      const plan = await this.requirePlanWithManager(manager, tenantId, id);
      const draft = await this.ensureDraft(manager, plan);
      draft.estimatedMinutes = dto.estimatedMinutes ?? null;
      draft.requiredSkills = dto.requiredSkills ?? [];
      draft.customFields = dto.customFields ?? {};
      await manager.getRepository(MaintenanceJobPlanVersionEntity).save(draft);
      await this.replaceSteps(manager, draft.id, dto.steps);
      return this.getWithManager(manager, tenantId, id);
    });
  }

  async publish(tenantId: string, id: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const plan = await this.requirePlanWithManager(manager, tenantId, id);
      const versionRepo = manager.getRepository(
        MaintenanceJobPlanVersionEntity,
      );
      const draft = await versionRepo.findOne({
        where: { jobPlanId: id, status: 'draft' },
        order: { versionNumber: 'DESC' },
      });
      if (!draft) throw new ConflictException('Mẫu không có phiên bản nháp.');
      const stepCount = await manager
        .getRepository(MaintenanceJobPlanStepEntity)
        .count({ where: { versionId: draft.id } });
      if (!stepCount) {
        throw new BadRequestException('Mẫu công việc chưa có bước thực hiện.');
      }
      if (plan.currentVersionId) {
        await versionRepo.update(
          { id: plan.currentVersionId, status: 'published' },
          { status: 'retired' },
        );
      }
      draft.status = 'published';
      draft.publishedBy = userId;
      draft.publishedAt = new Date();
      await versionRepo.save(draft);
      plan.status = 'published';
      plan.currentVersionId = draft.id;
      await manager.getRepository(MaintenanceJobPlanEntity).save(plan);
      return this.getWithManager(manager, tenantId, id);
    });
  }

  async archive(tenantId: string, id: string) {
    const plan = await this.requirePlan(tenantId, id);
    plan.status = 'archived';
    return this.plans.save(plan);
  }

  private async requirePlan(tenantId: string, id: string) {
    const plan = await this.plans.findOne({ where: { tenantId, id } });
    if (!plan) throw new NotFoundException('Maintenance job plan not found.');
    return plan;
  }

  private async requirePlanWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
  ) {
    const plan = await manager
      .getRepository(MaintenanceJobPlanEntity)
      .findOne({ where: { tenantId, id } });
    if (!plan) throw new NotFoundException('Maintenance job plan not found.');
    return plan;
  }

  private async ensureDraft(
    manager: EntityManager,
    plan: MaintenanceJobPlanEntity,
  ) {
    const versionRepo = manager.getRepository(MaintenanceJobPlanVersionEntity);
    const draft = await versionRepo.findOne({
      where: { jobPlanId: plan.id, status: 'draft' },
      order: { versionNumber: 'DESC' },
    });
    if (draft) return draft;
    const source = plan.currentVersionId
      ? await versionRepo.findOneOrFail({
          where: { id: plan.currentVersionId },
        })
      : null;
    const latest = await versionRepo
      .createQueryBuilder('version')
      .select('MAX(version.versionNumber)', 'max')
      .where('version.jobPlanId = :jobPlanId', { jobPlanId: plan.id })
      .getRawOne<{ max: string | null }>();
    const next = await versionRepo.save({
      jobPlanId: plan.id,
      versionNumber: Number(latest?.max ?? 0) + 1,
      status: 'draft',
      estimatedMinutes: source?.estimatedMinutes ?? null,
      requiredSkills: source?.requiredSkills ?? [],
      customFields: source?.customFields ?? {},
      publishedBy: null,
      publishedAt: null,
    });
    if (source) {
      const sourceSteps = await manager
        .getRepository(MaintenanceJobPlanStepEntity)
        .find({
          where: { versionId: source.id },
          order: { sortOrder: 'ASC' },
        });
      await this.replaceSteps(
        manager,
        next.id,
        sourceSteps.map((step) => ({
          key: step.key,
          type: step.type,
          title: step.title,
          description: step.description ?? undefined,
          isRequired: step.isRequired,
          config: step.config,
        })),
      );
    }
    return next;
  }

  private async replaceSteps(
    manager: EntityManager,
    versionId: string,
    inputs: MaintenanceJobPlanStepInputDto[],
  ) {
    const repo = manager.getRepository(MaintenanceJobPlanStepEntity);
    await repo.delete({ versionId });
    await repo.save(
      inputs.map((input, index) =>
        repo.create({
          versionId,
          key: input.key,
          sortOrder: index,
          type: input.type,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          isRequired: input.isRequired ?? true,
          config: input.config ?? {},
        }),
      ),
    );
  }

  private assertUniqueStepKeys(steps: MaintenanceJobPlanStepInputDto[]) {
    const keys = new Set<string>();
    for (const step of steps) {
      if (keys.has(step.key)) {
        throw new BadRequestException(`Step key "${step.key}" bị trùng.`);
      }
      keys.add(step.key);
    }
  }

  private async getWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
  ) {
    const plan = await this.requirePlanWithManager(manager, tenantId, id);
    const versions = await manager
      .getRepository(MaintenanceJobPlanVersionEntity)
      .find({
        where: { jobPlanId: id },
        order: { versionNumber: 'DESC' },
      });
    const selected =
      versions.find((version) => version.status === 'draft') ??
      versions.find((version) => version.id === plan.currentVersionId) ??
      versions[0];
    return {
      ...plan,
      versions,
      selectedVersion: selected
        ? {
            ...selected,
            steps: await manager
              .getRepository(MaintenanceJobPlanStepEntity)
              .find({
                where: { versionId: selected.id },
                order: { sortOrder: 'ASC' },
              }),
          }
        : null,
    };
  }
}
