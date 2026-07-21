import { Controller, Get, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';
import { REDIS } from '../redis/redis.module';
import { StorageService } from '../storage/storage.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get()
  async check() {
    const [database, redis, minio] = await Promise.all([
      this.dataSource
        .query('SELECT 1')
        .then(() => true)
        .catch(() => false),
      this.redis
        .ping()
        .then(() => true)
        .catch(() => false),
      this.storage.isReady(),
    ]);
    return {
      status: database && redis && minio ? 'ok' : 'degraded',
      services: { database, redis, minio },
    };
  }
}
