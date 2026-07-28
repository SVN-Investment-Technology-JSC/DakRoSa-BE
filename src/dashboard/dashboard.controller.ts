import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { PERMISSIONS } from '../common/constants/permissions';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  async summary(@CurrentUser() user: AuthUser) {
    const result = await this.dataSource.query<
      Array<{
        users: string;
        active_users: string;
        roles: string;
        events_today: string;
      }>
    >(
      `
      SELECT
        (
          SELECT COUNT(*)
          FROM tenant_memberships
          WHERE tenant_id = $1
        )::text AS users,
        (
          SELECT COUNT(*)
          FROM tenant_memberships membership
          JOIN users app_user ON app_user.id = membership.user_id
          WHERE membership.tenant_id = $1
            AND membership.status = 'active'
            AND app_user.is_active = true
        )::text AS active_users,
        (
          SELECT COUNT(*)
          FROM roles
          WHERE tenant_id = $1
            AND code <> 'admin'
        )::text AS roles,
        (
          SELECT COUNT(*)
          FROM audit_logs
          WHERE tenant_id = $1
            AND created_at >= date_trunc('day', now())
        )::text AS events_today
    `,
      [user.tenantId],
    );
    const row = result[0];
    return {
      users: Number(row?.users ?? 0),
      activeUsers: Number(row?.active_users ?? 0),
      roles: Number(row?.roles ?? 0),
      eventsToday: Number(row?.events_today ?? 0),
      collector: { status: 'not_configured', label: 'Chờ PoC Collector' },
    };
  }

  @Get('operations-summary')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  async operationsSummary(@CurrentUser() user: AuthUser) {
    const result = await this.dataSource.query<
      Array<{
        total_equipments: string;
        downtime_minutes: string;
        draft_wos: string;
        in_progress_wos: string;
        completed_wos: string;
        incidents_last_30_days: string;
        maintenances_last_30_days: string;
      }>
    >(
      `
      SELECT
        (SELECT COUNT(*) FROM equipments WHERE tenant_id = $1)::text AS total_equipments,
        (SELECT COALESCE(SUM(downtime_minutes), 0) FROM work_orders WHERE tenant_id = $1 AND created_at >= date_trunc('month', now()))::text AS downtime_minutes,
        (SELECT COUNT(*) FROM work_orders WHERE tenant_id = $1 AND status = 'DRAFT')::text AS draft_wos,
        (SELECT COUNT(*) FROM work_orders WHERE tenant_id = $1 AND status IN ('ASSIGNED', 'IN_PROGRESS'))::text AS in_progress_wos,
        (SELECT COUNT(*) FROM work_orders WHERE tenant_id = $1 AND status IN ('COMPLETED', 'CLOSED'))::text AS completed_wos,
        (SELECT COUNT(*) FROM work_orders WHERE tenant_id = $1 AND type = 'INCIDENT' AND created_at >= now() - interval '30 days')::text AS incidents_last_30_days,
        (SELECT COUNT(*) FROM work_orders WHERE tenant_id = $1 AND type = 'MAINTENANCE' AND created_at >= now() - interval '30 days')::text AS maintenances_last_30_days
      `,
      [user.tenantId],
    );

    const row = result[0];

    const chartResult = await this.dataSource.query<
      Array<{
        date: Date;
        downtime: string;
      }>
    >(
      `
      SELECT date_trunc('day', created_at) AS date, COALESCE(SUM(downtime_minutes), 0)::text AS downtime
      FROM work_orders
      WHERE tenant_id = $1 AND type = 'INCIDENT' AND created_at >= now() - interval '7 days'
      GROUP BY date
      ORDER BY date ASC
      `,
      [user.tenantId],
    );

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const found = chartResult.find(
        (c) => new Date(c.date).toISOString().split('T')[0] === dateStr,
      );
      return {
        date: dateStr,
        downtime: found ? Number(found.downtime) : 0,
      };
    });

    return {
      equipments: {
        total: Number(row?.total_equipments ?? 0),
      },
      workOrders: {
        downtimeMinutesThisMonth: Number(row?.downtime_minutes ?? 0),
        draft: Number(row?.draft_wos ?? 0),
        inProgress: Number(row?.in_progress_wos ?? 0),
        completed: Number(row?.completed_wos ?? 0),
        incidents30d: Number(row?.incidents_last_30_days ?? 0),
        maintenances30d: Number(row?.maintenances_last_30_days ?? 0),
      },
      downtimeChart: last7Days,
    };
  }
}
