import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import {
  CreateWorkflowTemplateDto,
  ExecuteWorkflowStepDto,
} from './dto/workflow.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly engineService: WorkflowEngineService) {}

  /** Lấy danh sách mẫu quy trình – dùng cho trang Quản lý */
  @Get('templates')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async list(@CurrentUser() user: AuthUser) {
    return this.engineService.listTemplates(user.tenantId);
  }

  /** Lấy sơ đồ chi tiết 1 mẫu quy trình – dùng cho Mini-map */
  @Get('templates/:id/preview')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async preview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.getTemplatePreview(user.tenantId, id);
  }

  /** Tạo mới mẫu quy trình */
  @Post('templates')
  @RequirePermissions(PERMISSIONS.WORKFLOW_CREATE)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkflowTemplateDto,
  ) {
    return this.engineService.createTemplate(user.tenantId, dto);
  }

  /** Thực thi bước trong quy trình (Approve / Reject) */
  @Post('execute')
  @RequirePermissions(PERMISSIONS.WORKFLOW_EXECUTE)
  async execute(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExecuteWorkflowStepDto,
  ) {
    return this.engineService.executeStep(user, dto);
  }
}
