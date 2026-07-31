import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisLockService } from '../redis/redis-lock.service';
import { WorkOrderService } from './work-order.service';

@Injectable()
export class MaintenanceWorkOrderScheduler {
  private readonly logger = new Logger(MaintenanceWorkOrderScheduler.name);

  constructor(
    private readonly workOrders: WorkOrderService,
    private readonly locks: RedisLockService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async generateDueWorkOrders() {
    try {
      const lockResult = await this.locks.runExclusive(
        'dakrosa:jobs:maintenance-work-orders',
        10 * 60_000,
        () => this.workOrders.generateDueOccurrences(),
      );
      if (!lockResult.acquired) {
        this.logger.debug(
          'Work-order generation is already running on another instance.',
        );
        return;
      }
      if ((lockResult.value?.created ?? 0) > 0) {
        this.logger.log(
          `Generated ${lockResult.value?.created ?? 0} maintenance work orders.`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Unable to generate due maintenance work orders.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
