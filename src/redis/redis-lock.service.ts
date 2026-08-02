import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';

export interface DistributedLockResult<T> {
  acquired: boolean;
  value?: T;
}

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async runExclusive<T>(
    key: string,
    ttlMs: number,
    work: () => Promise<T>,
  ): Promise<DistributedLockResult<T>> {
    const token = randomUUID();
    const acquired = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') return { acquired: false };

    const refreshEveryMs = Math.max(1_000, Math.floor(ttlMs / 3));
    const refreshTimer = setInterval(() => {
      void this.extend(key, token, ttlMs);
    }, refreshEveryMs);
    refreshTimer.unref();

    try {
      return { acquired: true, value: await work() };
    } finally {
      clearInterval(refreshTimer);
      await this.release(key, token);
    }
  }

  private async extend(key: string, token: string, ttlMs: number) {
    try {
      await this.redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end',
        1,
        key,
        token,
        ttlMs.toString(),
      );
    } catch (error) {
      this.logger.warn(
        `Unable to extend distributed lock "${key}": ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async release(key: string, token: string) {
    try {
      await this.redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        1,
        key,
        token,
      );
    } catch (error) {
      this.logger.warn(
        `Unable to release distributed lock "${key}": ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
