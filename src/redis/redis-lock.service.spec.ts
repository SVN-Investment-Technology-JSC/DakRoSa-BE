import Redis from 'ioredis';
import { RedisLockService } from './redis-lock.service';

describe('RedisLockService', () => {
  it('does not run work when another process owns the lock', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue(null),
      eval: jest.fn(),
    } as unknown as Redis;
    const service = new RedisLockService(redis);
    const work = jest.fn().mockResolvedValue('done');

    await expect(
      service.runExclusive('job:test', 60_000, work),
    ).resolves.toEqual({ acquired: false });
    expect(work).not.toHaveBeenCalled();
  });

  it('runs work and releases only the owned lock', async () => {
    const evalMock = jest.fn().mockResolvedValue(1);
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      eval: evalMock,
    } as unknown as Redis;
    const service = new RedisLockService(redis);

    await expect(
      service.runExclusive('job:test', 60_000, () => Promise.resolve('done')),
    ).resolves.toEqual({ acquired: true, value: 'done' });
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("del"'),
      1,
      'job:test',
      expect.any(String),
    );
  });
});
