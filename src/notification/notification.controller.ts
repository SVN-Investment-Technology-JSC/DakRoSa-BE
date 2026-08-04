import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  /** Lấy hộp thư thông báo (tối đa 50 mục mới nhất) */
  @Get()
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  async getInbox(@CurrentUser() user: AuthUser) {
    return this.notifService.getInbox(user.tenantId, user.id);
  }

  /** Đếm số thông báo chưa đọc – dùng cho chuông thông báo trên Header */
  @Get('unread-count')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  async unreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notifService.getUnreadCount(
      user.tenantId,
      user.id,
    );
    return { count };
  }

  /** Đánh dấu tất cả là đã đọc */
  @Patch('mark-all-read')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.notifService.markAllRead(user.tenantId, user.id);
    return { success: true };
  }

  /** Đánh dấu 1 thông báo là đã đọc */
  @Patch(':id/read')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_VIEW)
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notifService.markOneRead(user.tenantId, user.id, id);
    return { success: true };
  }
}
