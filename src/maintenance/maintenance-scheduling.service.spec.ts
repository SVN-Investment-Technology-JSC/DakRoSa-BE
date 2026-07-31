import { BadRequestException } from '@nestjs/common';
import { MaintenanceTriggerType } from '../database/entities';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';

describe('MaintenanceSchedulingService recurrence preview', () => {
  const createService = () =>
    new MaintenanceSchedulingService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  it('keeps the configured local time across a monthly RRULE', () => {
    const result = createService().preview({
      timezone: 'Asia/Ho_Chi_Minh',
      startDate: '2026-01-15',
      horizonDays: 120,
      triggers: [
        {
          type: MaintenanceTriggerType.TIME_RRULE,
          config: {
            rrule: 'FREQ=MONTHLY;COUNT=3',
            time: '08:30',
          },
        },
      ],
    });

    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.localDateTime.slice(0, 16))).toEqual(
      ['2026-01-15T08:30', '2026-02-15T08:30', '2026-03-15T08:30'],
    );
  });

  it('previews only time triggers and leaves event triggers runtime-driven', () => {
    const result = createService().preview({
      timezone: 'UTC',
      startDate: '2026-07-01',
      horizonDays: 10,
      triggers: [
        {
          type: MaintenanceTriggerType.DOMAIN_EVENT,
          config: { eventKey: 'SCADA.ALARM' },
        },
        {
          type: MaintenanceTriggerType.TIME_RRULE,
          config: { rrule: 'FREQ=DAILY;COUNT=2', time: '06:00' },
        },
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.triggerIndex === 1)).toBe(true);
  });

  it('rejects an invalid RRULE before a schedule can be saved', () => {
    expect(() =>
      createService().preview({
        timezone: 'Asia/Ho_Chi_Minh',
        startDate: '2026-07-01',
        triggers: [
          {
            type: MaintenanceTriggerType.TIME_RRULE,
            config: { rrule: 'NOT-A-RRULE', time: '08:00' },
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
