import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { PERMISSIONS } from '../common/constants/permissions';
import {
  ClientContext,
  ClientContextParam,
} from '../common/decorators/client-context.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireTenantModules } from '../common/decorators/tenant-module.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { SubmissionQueryDto } from './dto/submission-query.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { EOfficeService } from './e-office.service';

@ApiTags('E-Office')
@ApiBearerAuth()
@UseGuards(TenantModuleGuard)
@RequireTenantModules('e-office')
@Controller({ path: 'e-office', version: '1' })
export class EOfficeController {
  constructor(private readonly service: EOfficeService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_VIEW)
  summary(@CurrentUser() user: AuthUser) {
    return this.service.summary(user);
  }

  @Get('work-items')
  @RequirePermissions(PERMISSIONS.WORK_ITEMS_VIEW)
  workItems(@CurrentUser() user: AuthUser) {
    return this.service.workItems(user);
  }

  @Get('reviewers')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_SUBMIT)
  reviewers(@CurrentUser() user: AuthUser) {
    return this.service.reviewers(user);
  }

  @Get('submissions')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_VIEW)
  list(@Query() query: SubmissionQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get('submissions/:id')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(id, user);
  }

  @Post('submissions')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_CREATE)
  create(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.create(dto, user, context);
  }

  @Patch('submissions/:id')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.update(id, dto, user, context);
  }

  @Post('submissions/:id/submit')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_SUBMIT)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSubmissionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.submit(id, dto, user, context);
  }

  @Post('submissions/:id/review')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_REVIEW)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSubmissionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.review(id, dto, user, context);
  }

  @Post('submissions/:id/cancel')
  @RequirePermissions(PERMISSIONS.SUBMISSIONS_SUBMIT)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.cancel(id, user, context);
  }
}
