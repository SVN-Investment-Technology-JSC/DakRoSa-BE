import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import { TenantEntity } from '../database/entities';
import { RedisLockService } from '../redis/redis-lock.service';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';

@Injectable()
export class MaintenanceOccurrenceScheduler {
  private readonly logger = new Logger(MaintenanceOccurrenceScheduler.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly scheduling: MaintenanceSchedulingService,
    private readonly locks: RedisLockService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async maintainRollingHorizon(): Promise<void> {
    try {
      const result = await this.locks.runExclusive(
        'dakrosa:jobs:maintenance-occurrences',
        15 * 60_000,
        async () => {
          const tenants = await this.tenants.find({
            where: { status: 'active' },
            select: { id: true },
          });
          const from = DateTime.utc().minus({ days: 1 }).toJSDate();
          const to = DateTime.utc().plus({ days: 90 }).toJSDate();
          for (const tenant of tenants) {
            try {
              await this.scheduling.materializeTenant(tenant.id, from, to);
            } catch (error) {
              this.logger.error(
                `Occurrence materialization failed for tenant ${tenant.id}: ${
                  error instanceof Error ? error.message : 'unknown error'
                }`,
              );
            }
          }
        },
      );
      if (!result.acquired) {
        this.logger.debug(
          'Occurrence materialization is already running on another instance.',
        );
      }
    } catch (error) {
      this.logger.error(
        'Unable to maintain the occurrence rolling horizon.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
