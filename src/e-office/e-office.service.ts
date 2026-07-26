import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  SubmissionActionEntity,
  SubmissionEntity,
  SubmissionStatus,
  TenantMembershipEntity,
} from '../database/entities';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { SubmissionQueryDto } from './dto/submission-query.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Injectable()
export class EOfficeService {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissions: Repository<SubmissionEntity>,
    @InjectRepository(SubmissionActionEntity)
    private readonly actions: Repository<SubmissionActionEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly memberships: Repository<TenantMembershipEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: SubmissionQueryDto, user: AuthUser) {
    const builder = this.submissions
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.requester', 'requester')
      .leftJoinAndSelect('submission.currentAssignee', 'currentAssignee')
      .where('submission.tenantId = :tenantId', {
        tenantId: user.tenantId,
      })
      .orderBy('submission.updatedAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.search?.trim()) {
      builder.andWhere(
        new Brackets((search) => {
          search
            .where('submission.code ILIKE :search', {
              search: `%${query.search?.trim()}%`,
            })
            .orWhere('submission.title ILIKE :search', {
              search: `%${query.search?.trim()}%`,
            });
        }),
      );
    }
    if (query.status) {
      builder.andWhere('submission.status = :status', {
        status: query.status,
      });
    }
    if (query.priority) {
      builder.andWhere('submission.priority = :priority', {
        priority: query.priority,
      });
    }
    if (query.scope === 'created-by-me') {
      builder.andWhere('submission.requesterId = :userId', {
        userId: user.id,
      });
    }
    if (query.scope === 'assigned-to-me') {
      builder.andWhere('submission.currentAssigneeId = :userId', {
        userId: user.id,
      });
    }

    const [items, total] = await builder.getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async workItems(user: AuthUser) {
    const items = await this.submissions.find({
      where: {
        tenantId: user.tenantId,
        currentAssigneeId: user.id,
        status: 'in_review',
      },
      relations: { requester: true },
      order: { priority: 'DESC', dueAt: 'ASC', updatedAt: 'DESC' },
      take: 50,
    });
    return {
      items,
      total: items.length,
    };
  }

  async reviewers(user: AuthUser) {
    const memberships = await this.memberships
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'reviewer')
      .innerJoin('membership.roles', 'role')
      .leftJoin('role.permissions', 'permission')
      .where('membership.tenantId = :tenantId', {
        tenantId: user.tenantId,
      })
      .andWhere('membership.status = :status', { status: 'active' })
      .andWhere('reviewer.isActive = true')
      .andWhere('(role.code = :admin OR permission.key = :reviewPermission)', {
        admin: 'admin',
        reviewPermission: 'submissions.review',
      })
      .orderBy('reviewer.displayName', 'ASC')
      .getMany();
    const uniqueReviewers = new Map(
      memberships.map((membership) => [
        membership.user.id,
        {
          id: membership.user.id,
          displayName: membership.user.displayName,
          username: membership.user.username,
        },
      ]),
    );
    return [...uniqueReviewers.values()];
  }

  async summary(user: AuthUser) {
    const rows = await this.submissions
      .createQueryBuilder('submission')
      .select('submission.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('submission.tenantId = :tenantId', {
        tenantId: user.tenantId,
      })
      .groupBy('submission.status')
      .getRawMany<{ status: SubmissionStatus; count: number }>();
    const counts = Object.fromEntries(
      rows.map((row) => [row.status, Number(row.count)]),
    );
    return {
      draft: counts.draft ?? 0,
      inReview: counts.in_review ?? 0,
      returned: counts.returned ?? 0,
      approved: counts.approved ?? 0,
      cancelled: counts.cancelled ?? 0,
    };
  }

  async get(id: string, user: AuthUser): Promise<SubmissionEntity> {
    const submission = await this.submissions.findOne({
      where: { id, tenantId: user.tenantId },
      relations: {
        requester: true,
        currentAssignee: true,
        actions: { actor: true },
      },
      order: { actions: { createdAt: 'ASC' } },
    });
    if (!submission) {
      throw new NotFoundException('Không tìm thấy hồ sơ trình ký.');
    }
    return submission;
  }

  async create(
    dto: CreateSubmissionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SubmissionEntity> {
    const now = new Date();
    const submission = await this.submissions.save(
      this.submissions.create({
        tenantId: user.tenantId,
        code: `HS-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        documentType: dto.documentType.trim(),
        priority: dto.priority,
        status: 'draft',
        workflowKey: 'standard-approval',
        workflowVersion: 1,
        currentStep: 'draft',
        requesterId: user.id,
        currentAssigneeId: null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        submittedAt: null,
        decidedAt: null,
        metadata: dto.metadata ?? {},
      }),
    );
    await this.actions.save(
      this.actions.create({
        tenantId: user.tenantId,
        submissionId: submission.id,
        actorId: user.id,
        action: 'create',
        fromStatus: null,
        toStatus: 'draft',
        note: null,
        metadata: {},
      }),
    );
    await this.recordAudit(user, context, 'create', submission.id);
    return this.get(submission.id, user);
  }

  async update(
    id: string,
    dto: UpdateSubmissionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SubmissionEntity> {
    const submission = await this.get(id, user);
    this.assertEditable(submission, user);
    if (dto.title !== undefined) submission.title = dto.title.trim();
    if (dto.summary !== undefined)
      submission.summary = dto.summary.trim() || null;
    if (dto.documentType !== undefined)
      submission.documentType = dto.documentType.trim();
    if (dto.priority !== undefined) submission.priority = dto.priority;
    if (dto.dueAt !== undefined)
      submission.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.metadata !== undefined) submission.metadata = dto.metadata;
    await this.submissions.save(submission);
    await this.recordAudit(user, context, 'update', submission.id, {
      fields: Object.keys(dto),
    });
    return this.get(submission.id, user);
  }

  async submit(
    id: string,
    dto: SubmitSubmissionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SubmissionEntity> {
    const submission = await this.get(id, user);
    this.assertEditable(submission, user);
    await this.assertActiveTenantUser(dto.assigneeId, user.tenantId);
    const fromStatus = submission.status;
    await this.transition(submission, user, 'submit', 'in_review', dto.note, {
      currentStep: 'manager-review',
      currentAssigneeId: dto.assigneeId,
      submittedAt: submission.submittedAt ?? new Date(),
      decidedAt: null,
    });
    await this.recordAudit(user, context, 'submit', submission.id, {
      fromStatus,
      assigneeId: dto.assigneeId,
    });
    return this.get(submission.id, user);
  }

  async review(
    id: string,
    dto: ReviewSubmissionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SubmissionEntity> {
    const submission = await this.get(id, user);
    if (submission.status !== 'in_review') {
      throw new BadRequestException('Hồ sơ không ở trạng thái chờ duyệt.');
    }
    if (
      submission.currentAssigneeId !== user.id &&
      !user.roleCodes.includes('admin')
    ) {
      throw new ForbiddenException('Hồ sơ không được phân công cho bạn.');
    }
    if (dto.decision === 'return' && !dto.note?.trim()) {
      throw new BadRequestException('Cần nhập lý do trả lại hồ sơ.');
    }

    const approved = dto.decision === 'approve';
    const targetStatus: SubmissionStatus = approved ? 'approved' : 'returned';
    await this.transition(
      submission,
      user,
      approved ? 'approve' : 'return',
      targetStatus,
      dto.note,
      {
        currentStep: approved ? 'approved' : 'draft',
        currentAssigneeId: approved ? null : submission.requesterId,
        decidedAt: new Date(),
      },
    );
    await this.recordAudit(
      user,
      context,
      approved ? 'approve' : 'return',
      submission.id,
    );
    return this.get(submission.id, user);
  }

  async cancel(
    id: string,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SubmissionEntity> {
    const submission = await this.get(id, user);
    if (
      submission.requesterId !== user.id ||
      !['draft', 'returned', 'in_review'].includes(submission.status)
    ) {
      throw new BadRequestException(
        'Không thể hủy hồ sơ ở trạng thái hiện tại.',
      );
    }
    await this.transition(submission, user, 'cancel', 'cancelled', undefined, {
      currentStep: 'cancelled',
      currentAssigneeId: null,
      decidedAt: new Date(),
    });
    await this.recordAudit(user, context, 'cancel', submission.id);
    return this.get(submission.id, user);
  }

  private async transition(
    submission: SubmissionEntity,
    user: AuthUser,
    action: string,
    toStatus: SubmissionStatus,
    note: string | undefined,
    changes: Partial<SubmissionEntity>,
  ): Promise<void> {
    const fromStatus = submission.status;
    await this.dataSource.transaction(async (manager) => {
      Object.assign(submission, changes, { status: toStatus });
      await manager.getRepository(SubmissionEntity).save(submission);
      await manager.getRepository(SubmissionActionEntity).save(
        manager.getRepository(SubmissionActionEntity).create({
          tenantId: user.tenantId,
          submissionId: submission.id,
          actorId: user.id,
          action,
          fromStatus,
          toStatus,
          note: note?.trim() || null,
          metadata: {},
        }),
      );
    });
  }

  private assertEditable(submission: SubmissionEntity, user: AuthUser): void {
    if (
      submission.requesterId !== user.id ||
      !['draft', 'returned'].includes(submission.status)
    ) {
      throw new BadRequestException(
        'Chỉ người tạo mới có thể sửa hồ sơ nháp hoặc hồ sơ bị trả lại.',
      );
    }
  }

  private async assertActiveTenantUser(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    if (
      !(await this.memberships.exists({
        where: { userId, tenantId, status: 'active' },
      }))
    ) {
      throw new BadRequestException(
        'Người duyệt không thuộc doanh nghiệp đang truy cập.',
      );
    }
  }

  private recordAudit(
    user: AuthUser,
    context: ClientContext,
    action: string,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username,
      action,
      resource: 'submission',
      resourceId,
      ipAddress: context.ipAddress,
      details,
    });
  }
}
