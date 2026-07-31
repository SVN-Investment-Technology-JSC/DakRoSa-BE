import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  inbox(
    @Query('unreadOnly') unreadOnly: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.inbox(user.tenantId, user.id, unreadOnly === 'true');
  }

  @Patch(':id/read')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.markRead(user.tenantId, user.id, id);
  }

  @Patch('read-all')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.tenantId, user.id);
  }
}
