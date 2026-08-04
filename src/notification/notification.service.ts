import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
} from '../database/entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  async getInbox(
    tenantId: string,
    userId: string,
  ): Promise<NotificationEntity[]> {
    return this.notifRepo.find({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.notifRepo.count({ where: { tenantId, userId, isRead: false } });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.notifRepo.update(
      { tenantId, userId, isRead: false },
      { isRead: true },
    );
  }

  async markOneRead(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    await this.notifRepo.update({ id, tenantId, userId }, { isRead: true });
  }

  async create(params: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    actionUrl?: string;
    payload?: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const notif = this.notifRepo.create({
      ...params,
      body: params.body ?? null,
      actionUrl: params.actionUrl ?? null,
      payload: params.payload ?? {},
    });
    return this.notifRepo.save(notif);
  }
}
