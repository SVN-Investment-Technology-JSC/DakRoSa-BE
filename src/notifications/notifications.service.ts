import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationEntity } from '../database/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
  ) {}

  async inbox(tenantId: string, userId: string, unreadOnly = false) {
    const where = unreadOnly
      ? { tenantId, userId, readAt: IsNull() }
      : { tenantId, userId };
    const [items, unreadCount] = await Promise.all([
      this.notifications.find({
        where,
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.notifications.count({
        where: { tenantId, userId, readAt: IsNull() },
      }),
    ]);
    return { items, unreadCount };
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const notification = await this.notifications.findOne({
      where: { tenantId, userId, id },
    });
    if (!notification) throw new NotFoundException('Notification not found.');
    notification.readAt ??= new Date();
    return this.notifications.save(notification);
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.notifications
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
    return { success: true };
  }
}
