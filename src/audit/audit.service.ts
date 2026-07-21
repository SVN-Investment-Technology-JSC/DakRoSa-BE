import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities';

export interface AuditEvent {
  userId?: string | null;
  username?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  status?: string;
  ipAddress?: string | null;
  details?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  async record(event: AuditEvent): Promise<void> {
    await this.repository.save(
      this.repository.create({
        userId: event.userId ?? null,
        username: event.username ?? null,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId ?? null,
        status: event.status ?? 'success',
        ipAddress: event.ipAddress ?? null,
        details: event.details ?? null,
      }),
    );
  }

  async list(
    page: number,
    limit: number,
  ): Promise<{ items: AuditLogEntity[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
