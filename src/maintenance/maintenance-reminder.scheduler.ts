import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  MaintenanceOccurrenceEntity,
  NotificationEntity,
  TenantEntity,
  WorkOrderEntity,
} from '../database/entities';
import { RedisLockService } from '../redis/redis-lock.service';

@Injectable()
export class MaintenanceReminderScheduler {
  private readonly logger = new Logger(MaintenanceReminderScheduler.name);

  constructor(
    @InjectRepository(MaintenanceOccurrenceEntity)
    private readonly occurrences: Repository<MaintenanceOccurrenceEntity>,
    @InjectRepository(WorkOrderEntity)
    private readonly workOrders: Repository<WorkOrderEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly locks: RedisLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendReminders() {
    try {
      const result = await this.locks.runExclusive(
        'dakrosa:jobs:maintenance-reminders',
        5 * 60_000,
        () => this.processReminders(),
      );
      if (!result.acquired) {
        this.logger.debug(
          'Maintenance reminders are already being processed elsewhere.',
        );
      } else if ((result.value ?? 0) > 0) {
        this.logger.log(`Created ${result.value ?? 0} maintenance reminders.`);
      }
    } catch (error) {
      this.logger.error(
        'Unable to process maintenance reminders.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async processReminders() {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 366 * 24 * 60 * 60_000);
    const earliestOverdue = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
    const occurrences = await this.occurrences
      .createQueryBuilder('occurrence')
      .innerJoinAndSelect('occurrence.schedule', 'schedule')
      .leftJoinAndSelect('occurrence.equipment', 'equipment')
      .where('schedule.status = :scheduleStatus', { scheduleStatus: 'active' })
      .andWhere('occurrence.status IN (:...statuses)', {
        statuses: ['planned', 'generated'],
      })
      .andWhere('occurrence.planned_start_at BETWEEN :from AND :to', {
        from: earliestOverdue,
        to: maxFuture,
      })
      .take(5_000)
      .getMany();
    if (!occurrences.length) return 0;

    const workOrderIds = occurrences
      .map((item) => item.workOrderId)
      .filter((value): value is string => Boolean(value));
    const tenantIds = [...new Set(occurrences.map((item) => item.tenantId))];
    const [workOrders, tenants] = await Promise.all([
      workOrderIds.length
        ? this.workOrders.findBy({ id: In(workOrderIds) })
        : Promise.resolve([]),
      this.tenants.findBy({ id: In(tenantIds) }),
    ]);
    const workOrderById = new Map(workOrders.map((item) => [item.id, item]));
    const tenantSlugById = new Map(tenants.map((item) => [item.id, item.slug]));
    let created = 0;

    for (const occurrence of occurrences) {
      const workOrder = occurrence.workOrderId
        ? workOrderById.get(occurrence.workOrderId)
        : undefined;
      const recipients = new Set(
        [
          workOrder?.assigneeId,
          workOrder?.reporterId,
          occurrence.schedule.defaultAssigneeId,
          occurrence.schedule.defaultTechnicalReviewerId,
          occurrence.schedule.createdBy,
        ].filter((value): value is string => Boolean(value)),
      );
      if (!recipients.size) continue;

      const tenantSlug = tenantSlugById.get(occurrence.tenantId);
      const actionUrl = workOrder?.id
        ? tenantSlug
          ? `/t/${tenantSlug}/work-orders/${workOrder.id}`
          : `/work-orders/${workOrder.id}`
        : tenantSlug
          ? `/t/${tenantSlug}/maintenance/calendar`
          : '/maintenance/calendar';
      const subject =
        occurrence.equipment?.name ?? occurrence.schedule.name ?? 'Bảo trì';

      for (const minutes of occurrence.schedule.reminderMinutes ?? []) {
        const reminderAt = new Date(
          occurrence.plannedStartAt.getTime() - minutes * 60_000,
        );
        if (now < reminderAt || now >= occurrence.plannedStartAt) continue;
        created += await this.insertNotifications(occurrence, recipients, {
          type: 'maintenance.occurrence.reminder',
          title: `Sắp đến hạn: ${subject}`,
          body: `Công việc dự kiến bắt đầu lúc ${occurrence.plannedStartAt.toLocaleString(
            'vi-VN',
            { timeZone: occurrence.schedule.timezone },
          )}.`,
          actionUrl,
          dedupeSuffix: `reminder:${minutes}`,
        });
      }

      if (occurrence.dueAt && now > occurrence.dueAt) {
        created += await this.insertNotifications(occurrence, recipients, {
          type: 'maintenance.occurrence.overdue',
          title: `Quá hạn: ${subject}`,
          body: 'Công việc bảo trì đã quá hạn và cần được điều phối.',
          actionUrl,
          dedupeSuffix: 'overdue',
        });
      }
    }
    return created;
  }

  private async insertNotifications(
    occurrence: MaintenanceOccurrenceEntity,
    recipients: Set<string>,
    input: {
      type: string;
      title: string;
      body: string;
      actionUrl: string;
      dedupeSuffix: string;
    },
  ) {
    const result = await this.notifications
      .createQueryBuilder()
      .insert()
      .values(
        [...recipients].map((userId) => ({
          tenantId: occurrence.tenantId,
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          resourceType: 'maintenance_occurrence',
          resourceId: occurrence.id,
          actionUrl: input.actionUrl,
          dedupeKey: `maintenance:${occurrence.id}:${input.dedupeSuffix}`,
          readAt: null,
        })),
      )
      .orIgnore()
      .execute();
    return result.identifiers.length;
  }
}
