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
}
