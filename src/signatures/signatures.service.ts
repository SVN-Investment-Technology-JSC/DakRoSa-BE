import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { SignatureRequestEntity, SubmissionEntity } from '../database/entities';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(SignatureRequestEntity)
    private readonly requests: Repository<SignatureRequestEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissions: Repository<SubmissionEntity>,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser): Promise<SignatureRequestEntity[]> {
    return this.requests.find({
      where: { tenantId: user.tenantId },
      relations: { submission: true, requester: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async get(id: string, user: AuthUser): Promise<SignatureRequestEntity> {
    const request = await this.requests.findOne({
      where: { id, tenantId: user.tenantId },
      relations: { submission: true, requester: true },
    });
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu ký số.');
    }
    return request;
  }

  async create(
    dto: CreateSignatureRequestDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SignatureRequestEntity> {
    const submission = await this.submissions.findOneBy({
      id: dto.submissionId,
      tenantId: user.tenantId,
    });
    if (!submission) {
      throw new NotFoundException('Không tìm thấy hồ sơ trình ký.');
    }
    if (submission.status !== 'approved') {
      throw new BadRequestException(
        'Chỉ hồ sơ đã phê duyệt mới được đưa vào hàng đợi ký số.',
      );
    }
    if (
      await this.requests.exists({
        where: { submissionId: submission.id },
      })
    ) {
      throw new ConflictException('Hồ sơ đã có yêu cầu ký số.');
    }

    const request = await this.requests.save(
      this.requests.create({
        tenantId: user.tenantId,
        submissionId: submission.id,
        requestedBy: user.id,
        provider: 'unconfigured',
        signingMode: 'remote',
        status: 'pending',
        externalReference: null,
        completedAt: null,
        failureReason: null,
        metadata: {
          integrationState: 'awaiting-provider-configuration',
        },
      }),
    );
    await this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username,
      action: 'request',
      resource: 'digital_signature',
      resourceId: request.id,
      ipAddress: context.ipAddress,
      details: { submissionId: submission.id },
    });
    return this.get(request.id, user);
  }
}
