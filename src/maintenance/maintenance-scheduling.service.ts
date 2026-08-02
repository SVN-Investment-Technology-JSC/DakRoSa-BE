import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { rrulestr, RRuleSet } from 'rrule';
import { DataSource, In, Not, Repository } from 'typeorm';
import {
  EquipmentEntity,
  EquipmentGroupEntity,
  EquipmentGroupMemberEntity,
  MaintenanceJobPlanEntity,
  MaintenanceJobPlanVersionEntity,
  MaintenanceOccurrenceEntity,
  MaintenanceScheduleEntity,
  MaintenanceScheduleTargetEntity,
  MaintenanceTargetType,
  MaintenanceTriggerEntity,
  MaintenanceTriggerType,
  SiteEntity,
  WorkflowDefinitionEntity,
} from '../database/entities';
import {
  CreateMaintenanceScheduleDto,
  IngestMaintenanceEventDto,
  MaintenanceCalendarQueryDto,
  MaintenanceTriggerInputDto,
  PreviewMaintenanceScheduleDto,
} from './dto/maintenance-platform.dto';

@Injectable()
export class MaintenanceSchedulingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MaintenanceScheduleEntity)
    private readonly schedules: Repository<MaintenanceScheduleEntity>,
    @InjectRepository(MaintenanceScheduleTargetEntity)
    private readonly targets: Repository<MaintenanceScheduleTargetEntity>,
    @InjectRepository(MaintenanceTriggerEntity)
    private readonly triggers: Repository<MaintenanceTriggerEntity>,
    @InjectRepository(MaintenanceOccurrenceEntity)
    private readonly occurrences: Repository<MaintenanceOccurrenceEntity>,
    @InjectRepository(MaintenanceJobPlanEntity)
    private readonly jobPlans: Repository<MaintenanceJobPlanEntity>,
    @InjectRepository(MaintenanceJobPlanVersionEntity)
    private readonly jobPlanVersions: Repository<MaintenanceJobPlanVersionEntity>,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly workflows: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(EquipmentEntity)
    private readonly equipment: Repository<EquipmentEntity>,
    @InjectRepository(EquipmentGroupEntity)
    private readonly groups: Repository<EquipmentGroupEntity>,
    @InjectRepository(EquipmentGroupMemberEntity)
    private readonly groupMembers: Repository<EquipmentGroupMemberEntity>,
    @InjectRepository(SiteEntity)
    private readonly sites: Repository<SiteEntity>,
  ) {}

  async listSchedules(tenantId: string) {
    const schedules = await this.schedules.find({
      where: { tenantId },
      relations: { site: true, jobPlan: true, workflowDefinition: true },
      order: { updatedAt: 'DESC' },
    });
    const ids = schedules.map((schedule) => schedule.id);
    const [targets, triggers] = ids.length
      ? await Promise.all([
          this.targets.find({ where: { scheduleId: In(ids) } }),
          this.triggers.find({ where: { scheduleId: In(ids) } }),
        ])
      : [[], []];
    return schedules.map((schedule) => ({
      ...schedule,
      targets: targets.filter((target) => target.scheduleId === schedule.id),
      triggers: triggers.filter(
        (trigger) => trigger.scheduleId === schedule.id,
      ),
    }));
  }

  async getSchedule(tenantId: string, id: string) {
    const schedule = await this.requireSchedule(tenantId, id);
    return {
      ...schedule,
      targets: await this.targets.find({ where: { scheduleId: id } }),
      triggers: await this.triggers.find({ where: { scheduleId: id } }),
      occurrences: await this.occurrences.find({
        where: { tenantId, scheduleId: id },
        relations: { equipment: true },
        order: { plannedStartAt: 'DESC' },
        take: 100,
      }),
    };
  }

  async createSchedule(
    tenantId: string,
    userId: string,
    dto: CreateMaintenanceScheduleDto,
  ) {
    if (!dto.targets.length) {
      throw new BadRequestException('Lịch cần ít nhất một thiết bị hoặc nhóm.');
    }
    if (!dto.triggers.length) {
      throw new BadRequestException(
        'Lịch cần ít nhất một điều kiện kích hoạt.',
      );
    }
    await this.validateReferences(tenantId, dto);
    dto.triggers.forEach((trigger) =>
      this.validateTrigger(trigger, dto.startDate, dto.timezone),
    );
    return this.dataSource.transaction(async (manager) => {
      const scheduleRepo = manager.getRepository(MaintenanceScheduleEntity);
      const code = dto.code.trim().toUpperCase();
      if (await scheduleRepo.exists({ where: { tenantId, code } })) {
        throw new ConflictException(`Schedule code "${code}" already exists.`);
      }
      const schedule = await scheduleRepo.save(
        scheduleRepo.create({
          tenantId,
          siteId: dto.siteId ?? null,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          jobPlanId: dto.jobPlanId,
          workflowDefinitionId: dto.workflowDefinitionId,
          defaultAssigneeId: dto.defaultAssigneeId ?? null,
          defaultTechnicalReviewerId: dto.defaultTechnicalReviewerId ?? null,
          status: 'draft',
          timezone: dto.timezone,
          startDate: dto.startDate.slice(0, 10),
          endDate: dto.endDate?.slice(0, 10) ?? null,
          reminderMinutes: [...new Set(dto.reminderMinutes ?? [1440])].sort(
            (a, b) => b - a,
          ),
          createdBy: userId,
        }),
      );
      await manager.getRepository(MaintenanceScheduleTargetEntity).save(
        dto.targets.map((target) => ({
          scheduleId: schedule.id,
          targetType: target.targetType,
          targetId: target.targetId,
        })),
      );
      await manager.getRepository(MaintenanceTriggerEntity).save(
        dto.triggers.map((trigger) => ({
          scheduleId: schedule.id,
          type: trigger.type,
          config: trigger.config,
          nextDueAt:
            trigger.type === MaintenanceTriggerType.TIME_RRULE
              ? this.nextOccurrence(
                  trigger.config,
                  schedule.startDate,
                  schedule.timezone,
                )
              : null,
          lastFiredAt: null,
          isActive: trigger.isActive ?? true,
        })),
      );
      return schedule;
    });
  }

  async updateSchedule(
    tenantId: string,
    id: string,
    dto: CreateMaintenanceScheduleDto,
  ) {
    const schedule = await this.requireSchedule(tenantId, id);
    if (schedule.status !== 'draft') {
      throw new ConflictException(
        'Chỉ có thể chỉnh sửa kế hoạch nháp. Hãy tạo bản kế hoạch mới nếu lịch đã từng được kích hoạt.',
      );
    }
    if (
      await this.occurrences.exists({
        where: { tenantId, scheduleId: id },
      })
    ) {
      throw new ConflictException(
        'Kế hoạch đã có occurrence và không thể thay cấu trúc.',
      );
    }
    if (!dto.targets.length || !dto.triggers.length) {
      throw new BadRequestException(
        'Kế hoạch cần ít nhất một đối tượng và một trigger.',
      );
    }
    await this.validateReferences(tenantId, dto);
    dto.triggers.forEach((trigger) =>
      this.validateTrigger(trigger, dto.startDate, dto.timezone),
    );
    const code = dto.code.trim().toUpperCase();
    if (
      await this.schedules.exists({
        where: { tenantId, code, id: Not(id) },
      })
    ) {
      throw new ConflictException(`Schedule code "${code}" already exists.`);
    }

    await this.dataSource.transaction(async (manager) => {
      Object.assign(schedule, {
        siteId: dto.siteId ?? null,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        jobPlanId: dto.jobPlanId,
        workflowDefinitionId: dto.workflowDefinitionId,
        defaultAssigneeId: dto.defaultAssigneeId ?? null,
        defaultTechnicalReviewerId: dto.defaultTechnicalReviewerId ?? null,
        timezone: dto.timezone,
        startDate: dto.startDate.slice(0, 10),
        endDate: dto.endDate?.slice(0, 10) ?? null,
        reminderMinutes: [...new Set(dto.reminderMinutes ?? [1440])].sort(
          (a, b) => b - a,
        ),
      });
      await manager.getRepository(MaintenanceScheduleEntity).save(schedule);
      await manager
        .getRepository(MaintenanceScheduleTargetEntity)
        .delete({ scheduleId: id });
      await manager
        .getRepository(MaintenanceTriggerEntity)
        .delete({ scheduleId: id });
      await manager.getRepository(MaintenanceScheduleTargetEntity).save(
        dto.targets.map((target) => ({
          scheduleId: id,
          targetType: target.targetType,
          targetId: target.targetId,
        })),
      );
      await manager.getRepository(MaintenanceTriggerEntity).save(
        dto.triggers.map((trigger) => ({
          scheduleId: id,
          type: trigger.type,
          config: trigger.config,
          nextDueAt:
            trigger.type === MaintenanceTriggerType.TIME_RRULE
              ? this.nextOccurrence(
                  trigger.config,
                  schedule.startDate,
                  schedule.timezone,
                )
              : null,
          lastFiredAt: null,
          isActive: trigger.isActive ?? true,
        })),
      );
    });
    return this.getSchedule(tenantId, id);
  }

  preview(dto: PreviewMaintenanceScheduleDto) {
    if (!dto.triggers.length) {
      throw new BadRequestException('Cần ít nhất một trigger để xem trước.');
    }
    const fromDateTime = DateTime.fromISO(dto.startDate, {
      zone: dto.timezone,
    }).startOf('day');
    if (!fromDateTime.isValid) {
      throw new BadRequestException('Ngày bắt đầu hoặc timezone không hợp lệ.');
    }
    const horizonDays = dto.horizonDays ?? 90;
    const requestedEnd = dto.endDate
      ? DateTime.fromISO(dto.endDate, { zone: dto.timezone }).endOf('day')
      : fromDateTime.plus({ days: horizonDays }).endOf('day');
    const hardEnd = fromDateTime.plus({ days: 366 }).endOf('day');
    const toDateTime =
      requestedEnd.isValid && requestedEnd < hardEnd ? requestedEnd : hardEnd;
    if (!requestedEnd.isValid || toDateTime < fromDateTime) {
      throw new BadRequestException('Khoảng xem trước không hợp lệ.');
    }

    const items: Array<{
      triggerIndex: number;
      triggerType: MaintenanceTriggerType;
      plannedStartAt: string;
      localDateTime: string;
    }> = [];
    dto.triggers.forEach((trigger, triggerIndex) => {
      this.validateTrigger(trigger, dto.startDate, dto.timezone);
      if (trigger.type !== MaintenanceTriggerType.TIME_RRULE) return;
      const dates = this.occurrencesBetween(
        trigger.config,
        dto.startDate,
        dto.timezone,
        fromDateTime.toUTC().toJSDate(),
        toDateTime.toUTC().toJSDate(),
      ).slice(0, 100);
      dates.forEach((date) => {
        items.push({
          triggerIndex,
          triggerType: trigger.type,
          plannedStartAt: date.toISOString(),
          localDateTime: DateTime.fromJSDate(date)
            .setZone(dto.timezone)
            .toISO({ suppressMilliseconds: true })!,
        });
      });
    });
    items.sort((a, b) => a.plannedStartAt.localeCompare(b.plannedStartAt));
    return {
      timezone: dto.timezone,
      from: fromDateTime.toISODate(),
      to: toDateTime.toISODate(),
      items: items.slice(0, 200),
      truncated: items.length > 200,
    };
  }

  async activateSchedule(tenantId: string, id: string) {
    const schedule = await this.requireSchedule(tenantId, id);
    if (schedule.status === 'archived') {
      throw new ConflictException(
        'Kế hoạch đã lưu trữ không thể kích hoạt lại.',
      );
    }
    const [plan, workflow, targetCount, triggerCount] = await Promise.all([
      this.jobPlans.findOne({
        where: { id: schedule.jobPlanId, tenantId, status: 'published' },
      }),
      this.workflows.findOne({
        where: {
          id: schedule.workflowDefinitionId,
          tenantId,
          status: 'published',
        },
      }),
      this.targets.count({ where: { scheduleId: id } }),
      this.triggers.count({ where: { scheduleId: id, isActive: true } }),
    ]);
    if (!plan?.currentVersionId) {
      throw new BadRequestException('Mẫu công việc chưa được công bố.');
    }
    if (!workflow?.currentVersionId) {
      throw new BadRequestException('Quy trình chưa được công bố.');
    }
    if (!targetCount || !triggerCount) {
      throw new BadRequestException('Lịch thiếu đối tượng hoặc trigger.');
    }
    schedule.status = 'active';
    await this.schedules.save(schedule);
    await this.materializeTenant(
      tenantId,
      new Date(),
      DateTime.utc().plus({ days: 90 }).toJSDate(),
      id,
    );
    return this.getSchedule(tenantId, id);
  }

  async pauseSchedule(tenantId: string, id: string) {
    const schedule = await this.requireSchedule(tenantId, id);
    if (schedule.status !== 'active') {
      throw new ConflictException(
        'Chỉ kế hoạch đang chạy mới có thể tạm dừng.',
      );
    }
    schedule.status = 'paused';
    return this.schedules.save(schedule);
  }

  async archiveSchedule(tenantId: string, id: string) {
    const schedule = await this.requireSchedule(tenantId, id);
    if (schedule.status === 'archived') return schedule;
    schedule.status = 'archived';
    await this.schedules.save(schedule);
    await this.occurrences.update(
      { tenantId, scheduleId: id, status: 'planned' },
      { status: 'cancelled' },
    );
    return this.getSchedule(tenantId, id);
  }

  async skipOccurrence(
    tenantId: string,
    id: string,
    userId: string,
    reason?: string,
  ) {
    const occurrence = await this.occurrences.findOne({
      where: { tenantId, id },
    });
    if (!occurrence) {
      throw new NotFoundException('Maintenance occurrence not found.');
    }
    if (occurrence.status !== 'planned' || occurrence.workOrderId) {
      throw new ConflictException(
        'Chỉ occurrence chưa sinh phiếu mới có thể bỏ qua.',
      );
    }
    occurrence.status = 'skipped';
    occurrence.snapshot = {
      ...occurrence.snapshot,
      skippedAt: new Date().toISOString(),
      skippedBy: userId,
      skipReason: reason?.trim() || null,
    };
    return this.occurrences.save(occurrence);
  }

  async calendar(tenantId: string, query: MaintenanceCalendarQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ.');
    }
    await this.materializeTenant(tenantId, from, to);
    const builder = this.occurrences
      .createQueryBuilder('occurrence')
      .leftJoinAndSelect('occurrence.schedule', 'schedule')
      .leftJoinAndSelect('occurrence.equipment', 'equipment')
      .where('occurrence.tenant_id = :tenantId', { tenantId })
      .andWhere('occurrence.planned_start_at BETWEEN :from AND :to', {
        from,
        to,
      });
    if (query.siteId) {
      builder.andWhere('schedule.site_id = :siteId', { siteId: query.siteId });
    }
    if (query.equipmentId) {
      builder.andWhere('occurrence.equipment_id = :equipmentId', {
        equipmentId: query.equipmentId,
      });
    }
    if (query.status) {
      builder.andWhere('occurrence.status = :status', {
        status: query.status,
      });
    }
    return builder.orderBy('occurrence.planned_start_at', 'ASC').getMany();
  }

  async materializeTenant(
    tenantId: string,
    from: Date,
    to: Date,
    scheduleId?: string,
  ) {
    const scheduleWhere = scheduleId
      ? { tenantId, id: scheduleId, status: 'active' as const }
      : { tenantId, status: 'active' as const };
    const schedules = await this.schedules.find({ where: scheduleWhere });
    let created = 0;
    for (const schedule of schedules) {
      const [targets, triggers] = await Promise.all([
        this.targets.find({ where: { scheduleId: schedule.id } }),
        this.triggers.find({
          where: {
            scheduleId: schedule.id,
            type: MaintenanceTriggerType.TIME_RRULE,
            isActive: true,
          },
        }),
      ]);
      const equipmentIds = await this.expandTargets(tenantId, targets);
      for (const trigger of triggers) {
        const dates = this.occurrencesBetween(
          trigger.config,
          schedule.startDate,
          schedule.timezone,
          from,
          to,
        );
        for (const date of dates) {
          for (const equipmentId of equipmentIds) {
            const dedupeKey = `${schedule.id}:${trigger.id}:${equipmentId}:${date.toISOString()}`;
            const result = await this.occurrences
              .createQueryBuilder()
              .insert()
              .values({
                tenantId,
                scheduleId: schedule.id,
                triggerId: trigger.id,
                equipmentId,
                plannedStartAt: date,
                dueAt: await this.dueAt(schedule.jobPlanId, date),
                status: 'planned',
                dedupeKey,
                workOrderId: null,
                snapshot: {
                  triggerType: trigger.type,
                  triggerConfig: trigger.config,
                },
              })
              .orIgnore()
              .execute();
            created += result.identifiers.length;
          }
        }
        trigger.nextDueAt = this.nextOccurrence(
          trigger.config,
          schedule.startDate,
          schedule.timezone,
          to,
        );
        await this.triggers.save(trigger);
      }
    }
    return { created };
  }

  async ingestEvent(tenantId: string, dto: IngestMaintenanceEventDto) {
    const occurredAt = new Date(dto.occurredAt);
    const triggers = await this.triggers
      .createQueryBuilder('trigger')
      .innerJoinAndSelect('trigger.schedule', 'schedule')
      .where('schedule.tenant_id = :tenantId', { tenantId })
      .andWhere('schedule.status = :status', { status: 'active' })
      .andWhere('trigger.type IN (:...types)', {
        types: [
          MaintenanceTriggerType.DOMAIN_EVENT,
          MaintenanceTriggerType.CONDITION,
        ],
      })
      .andWhere('trigger.is_active = true')
      .getMany();
    let created = 0;
    for (const trigger of triggers) {
      if (trigger.config['eventKey'] !== dto.eventKey) continue;
      const condition = trigger.config['condition'];
      if (
        condition &&
        (typeof condition !== 'object' ||
          !this.evaluateCondition(
            condition as Record<string, unknown>,
            dto.payload,
          ))
      ) {
        continue;
      }
      const targets = await this.targets.find({
        where: { scheduleId: trigger.scheduleId },
      });
      const equipmentIds = dto.equipmentId
        ? [dto.equipmentId]
        : await this.expandTargets(tenantId, targets);
      for (const equipmentId of equipmentIds) {
        if (
          !(await this.targetContainsEquipment(tenantId, targets, equipmentId))
        ) {
          continue;
        }
        const result = await this.occurrences
          .createQueryBuilder()
          .insert()
          .values({
            tenantId,
            scheduleId: trigger.scheduleId,
            triggerId: trigger.id,
            equipmentId,
            plannedStartAt: occurredAt,
            dueAt: await this.dueAt(trigger.schedule.jobPlanId, occurredAt),
            status: 'planned',
            dedupeKey: `${trigger.scheduleId}:${trigger.id}:${equipmentId}:event:${dto.externalId}`,
            workOrderId: null,
            snapshot: {
              triggerType: trigger.type,
              eventKey: dto.eventKey,
              payload: dto.payload,
              externalId: dto.externalId,
            },
          })
          .orIgnore()
          .execute();
        created += result.identifiers.length;
      }
      trigger.lastFiredAt = occurredAt;
      await this.triggers.save(trigger);
    }
    return { created };
  }

  async createMeterOccurrence(
    tenantId: string,
    equipmentId: string,
    meterId: string,
    value: number,
    occurredAt: Date,
    externalId: string,
  ) {
    const triggers = await this.triggers
      .createQueryBuilder('trigger')
      .innerJoinAndSelect('trigger.schedule', 'schedule')
      .where('schedule.tenant_id = :tenantId', { tenantId })
      .andWhere('schedule.status = :status', { status: 'active' })
      .andWhere('trigger.type = :type', {
        type: MaintenanceTriggerType.METER_THRESHOLD,
      })
      .andWhere('trigger.is_active = true')
      .getMany();
    let created = 0;
    for (const trigger of triggers) {
      if (trigger.config['meterId'] !== meterId) continue;
      const threshold = trigger.config['threshold'];
      const interval = trigger.config['interval'];
      const lastTriggeredValue = trigger.config['lastTriggeredValue'];
      if (
        typeof threshold !== 'number' ||
        value < threshold ||
        (typeof lastTriggeredValue === 'number' &&
          typeof interval === 'number' &&
          value < lastTriggeredValue + interval)
      ) {
        continue;
      }
      const targets = await this.targets.find({
        where: { scheduleId: trigger.scheduleId },
      });
      if (
        !(await this.targetContainsEquipment(tenantId, targets, equipmentId))
      ) {
        continue;
      }
      const result = await this.occurrences
        .createQueryBuilder()
        .insert()
        .values({
          tenantId,
          scheduleId: trigger.scheduleId,
          triggerId: trigger.id,
          equipmentId,
          plannedStartAt: occurredAt,
          dueAt: await this.dueAt(trigger.schedule.jobPlanId, occurredAt),
          status: 'planned',
          dedupeKey: `${trigger.scheduleId}:${trigger.id}:${equipmentId}:meter:${externalId}`,
          workOrderId: null,
          snapshot: { triggerType: trigger.type, meterId, value, externalId },
        })
        .orIgnore()
        .execute();
      created += result.identifiers.length;
      trigger.config = { ...trigger.config, lastTriggeredValue: value };
      trigger.lastFiredAt = occurredAt;
      await this.triggers.save(trigger);
    }
    return created;
  }

  private async requireSchedule(tenantId: string, id: string) {
    const schedule = await this.schedules.findOne({
      where: { tenantId, id },
      relations: { site: true, jobPlan: true, workflowDefinition: true },
    });
    if (!schedule)
      throw new NotFoundException('Maintenance schedule not found.');
    return schedule;
  }

  private async validateReferences(
    tenantId: string,
    dto: CreateMaintenanceScheduleDto,
  ) {
    const [plan, workflow, site] = await Promise.all([
      this.jobPlans.findOne({
        where: { tenantId, id: dto.jobPlanId },
      }),
      this.workflows.findOne({
        where: { tenantId, id: dto.workflowDefinitionId },
      }),
      dto.siteId
        ? this.sites.findOne({ where: { tenantId, id: dto.siteId } })
        : Promise.resolve(null),
    ]);
    if (!plan) throw new BadRequestException('Mẫu công việc không hợp lệ.');
    if (!workflow) throw new BadRequestException('Quy trình không hợp lệ.');
    if (dto.siteId && !site)
      throw new BadRequestException('Nhà máy không hợp lệ.');
    for (const target of dto.targets) {
      if (target.targetType === MaintenanceTargetType.EQUIPMENT) {
        const equipment = await this.equipment.findOne({
          where: { tenantId, id: target.targetId },
        });
        if (!equipment) {
          throw new BadRequestException('Thiết bị mục tiêu không hợp lệ.');
        }
        if (dto.siteId && equipment.siteId && equipment.siteId !== dto.siteId) {
          throw new BadRequestException(
            'Thiết bị không thuộc nhà máy đã chọn.',
          );
        }
      } else {
        const group = await this.groups.findOne({
          where: { tenantId, id: target.targetId },
        });
        if (!group) {
          throw new BadRequestException('Nhóm thiết bị không hợp lệ.');
        }
      }
    }
  }

  private validateTrigger(
    trigger: MaintenanceTriggerInputDto,
    startDate: string,
    timezone: string,
  ) {
    if (trigger.type === MaintenanceTriggerType.TIME_RRULE) {
      if (typeof trigger.config['rrule'] !== 'string') {
        throw new BadRequestException('Trigger thời gian cần trường rrule.');
      }
      this.buildRule(trigger.config, startDate, timezone);
    } else if (trigger.type === MaintenanceTriggerType.METER_THRESHOLD) {
      if (
        typeof trigger.config['meterId'] !== 'string' ||
        typeof trigger.config['threshold'] !== 'number'
      ) {
        throw new BadRequestException(
          'Trigger chỉ số cần meterId và threshold.',
        );
      }
    } else if (trigger.type === MaintenanceTriggerType.DOMAIN_EVENT) {
      if (typeof trigger.config['eventKey'] !== 'string') {
        throw new BadRequestException('Trigger sự kiện cần eventKey.');
      }
    } else if (trigger.type === MaintenanceTriggerType.CONDITION) {
      if (trigger.config['mode'] === 'manual') return;
      if (
        typeof trigger.config['eventKey'] !== 'string' ||
        typeof trigger.config['condition'] !== 'object' ||
        trigger.config['condition'] === null
      ) {
        throw new BadRequestException(
          'Trigger điều kiện cần eventKey và biểu thức condition.',
        );
      }
    }
  }

  private buildRule(
    config: Record<string, unknown>,
    startDate: string,
    timezone: string,
  ): RRuleSet {
    const raw =
      typeof config['rrule'] === 'string'
        ? config['rrule'].replace(/^RRULE:/i, '')
        : '';
    const time =
      typeof config['time'] === 'string' && /^\d{2}:\d{2}$/.test(config['time'])
        ? config['time']
        : '00:00';
    const dt = DateTime.fromISO(`${startDate.slice(0, 10)}T${time}`, {
      zone: timezone,
    });
    if (!dt.isValid) {
      throw new BadRequestException('Ngày bắt đầu hoặc timezone không hợp lệ.');
    }
    const dtstart = dt.toFormat("yyyyMMdd'T'HHmmss");
    try {
      return rrulestr(`DTSTART;TZID=${timezone}:${dtstart}\nRRULE:${raw}`, {
        forceset: true,
      }) as RRuleSet;
    } catch {
      throw new BadRequestException('RRULE không hợp lệ.');
    }
  }

  private nextOccurrence(
    config: Record<string, unknown>,
    startDate: string,
    timezone: string,
    after = new Date(),
  ) {
    return this.buildRule(config, startDate, timezone).after(after, true);
  }

  private occurrencesBetween(
    config: Record<string, unknown>,
    startDate: string,
    timezone: string,
    from: Date,
    to: Date,
  ) {
    return this.buildRule(config, startDate, timezone).between(from, to, true);
  }

  private async expandTargets(
    tenantId: string,
    targets: MaintenanceScheduleTargetEntity[],
  ) {
    const ids = new Set<string>();
    for (const target of targets) {
      if (target.targetType === MaintenanceTargetType.EQUIPMENT) {
        const equipment = await this.equipment.findOne({
          where: { tenantId, id: target.targetId },
        });
        if (equipment) ids.add(equipment.id);
      } else {
        const group = await this.groups.findOne({
          where: { tenantId, id: target.targetId },
        });
        if (!group) continue;
        const members = await this.groupMembers.find({
          where: { groupId: group.id },
        });
        members.forEach((member) => ids.add(member.equipmentId));
      }
    }
    return [...ids];
  }

  private async targetContainsEquipment(
    tenantId: string,
    targets: MaintenanceScheduleTargetEntity[],
    equipmentId: string,
  ) {
    const equipment = await this.equipment.findOne({
      where: { tenantId, id: equipmentId },
    });
    if (!equipment) return false;
    if (
      targets.some(
        (target) =>
          target.targetType === MaintenanceTargetType.EQUIPMENT &&
          target.targetId === equipmentId,
      )
    ) {
      return true;
    }
    const groupIds = targets
      .filter(
        (target) => target.targetType === MaintenanceTargetType.EQUIPMENT_GROUP,
      )
      .map((target) => target.targetId);
    return groupIds.length
      ? this.groupMembers.exists({
          where: { groupId: In(groupIds), equipmentId },
        })
      : false;
  }

  private async dueAt(jobPlanId: string, start: Date) {
    const plan = await this.jobPlans.findOne({ where: { id: jobPlanId } });
    const version = plan?.currentVersionId
      ? await this.jobPlanVersions.findOne({
          where: { id: plan.currentVersionId },
        })
      : null;
    return version?.estimatedMinutes
      ? new Date(start.getTime() + version.estimatedMinutes * 60_000)
      : null;
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    if ('all' in condition) {
      return (
        Array.isArray(condition['all']) &&
        condition['all'].every(
          (clause) =>
            typeof clause === 'object' &&
            clause !== null &&
            this.evaluateCondition(clause as Record<string, unknown>, payload),
        )
      );
    }
    if ('any' in condition) {
      return (
        Array.isArray(condition['any']) &&
        condition['any'].some(
          (clause) =>
            typeof clause === 'object' &&
            clause !== null &&
            this.evaluateCondition(clause as Record<string, unknown>, payload),
        )
      );
    }
    const fact =
      typeof condition['fact'] === 'string'
        ? payload[condition['fact']]
        : undefined;
    switch (condition['op']) {
      case 'eq':
        return fact === condition['value'];
      case 'neq':
        return fact !== condition['value'];
      case 'gt':
        return (
          typeof fact === 'number' &&
          typeof condition['value'] === 'number' &&
          fact > condition['value']
        );
      case 'gte':
        return (
          typeof fact === 'number' &&
          typeof condition['value'] === 'number' &&
          fact >= condition['value']
        );
      case 'contains':
        return Array.isArray(fact) ? fact.includes(condition['value']) : false;
      default:
        return false;
    }
  }
}
