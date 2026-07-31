import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';
import { RedisLockService } from './redis-lock.service';

export { REDIS } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        }),
    },
    RedisLockService,
  ],
  exports: [REDIS, RedisLockService],
})
export class RedisModule {}
