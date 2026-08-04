import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import {
  CreateWorkflowDefinitionDto,
  DraftWorkflowVersionDto,
  CloneWorkflowDefinitionDto,
  ExecuteWorkflowStepDto,
  UpdateMasterBoardDto,
  UpdateMasterBoardCellDto,
} from './dto/workflow.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly engineService: WorkflowEngineService) {}

  @Get('definitions')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async getDefinitions(@CurrentUser() user: AuthUser) {
    return this.engineService.listDefinitions(user.tenantId, false);
  }

  @Get('definitions/archived')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async getArchivedDefinitions(@CurrentUser() user: AuthUser) {
    return this.engineService.listDefinitions(user.tenantId, true);
  }

  @Get('definitions/:id')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async getDefinition(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.getDefinition(user.tenantId, id);
  }

  @Post('definitions')
  @RequirePermissions(PERMISSIONS.WORKFLOW_CREATE)
  async createDefinition(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkflowDefinitionDto,
  ) {
    return this.engineService.createDefinition(user.tenantId, dto);
  }

  @Put('definitions/:id/draft')
  @RequirePermissions(PERMISSIONS.WORKFLOW_UPDATE)
  async saveDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DraftWorkflowVersionDto,
  ) {
    return this.engineService.saveDraft(user.tenantId, id, dto);
  }

  @Post('definitions/:id/validate')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async validateDefinition(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.validateDefinition(user.tenantId, id);
  }

  @Post('definitions/:id/publish')
  @RequirePermissions(PERMISSIONS.WORKFLOW_UPDATE)
  async publishDefinition(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.publishDefinition(user.tenantId, id);
  }

  @Post('definitions/:id/clone')
  @RequirePermissions(PERMISSIONS.WORKFLOW_CREATE)
  async cloneDefinition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloneWorkflowDefinitionDto,
  ) {
    return this.engineService.cloneDefinition(user.tenantId, id, dto);
  }

  @Patch('definitions/:id/archive')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DELETE)
  async archiveDefinition(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.updateDefinitionStatus(user.tenantId, id, 'archived');
  }

  @Patch('definitions/:id/restore')
  @RequirePermissions(PERMISSIONS.WORKFLOW_UPDATE)
  async restoreDefinition(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.updateDefinitionStatus(user.tenantId, id, 'draft');
  }

  @Delete('definitions/:id/permanent')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DELETE)
  async deletePermanently(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.engineService.deleteDefinition(user.tenantId, id);
    return { id, deleted: true };
  }

  @Get('definitions/:id/master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async getMasterBoard(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.engineService.getMasterBoard(user.tenantId, id);
  }

  @Get('master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_VIEW)
  async getGlobalMasterBoard(@CurrentUser() user: AuthUser) {
    return this.engineService.getGlobalMasterBoard(user.tenantId);
  }

  @Put('master-board/cell')
  @RequirePermissions(PERMISSIONS.WORKFLOW_UPDATE)
  async updateMasterBoardCell(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMasterBoardCellDto,
  ) {
    return this.engineService.updateMasterBoardCell(user.tenantId, dto);
  }

  @Put('definitions/:id/master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_UPDATE)
  async updateMasterBoard(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMasterBoardDto,
  ) {
    return this.engineService.updateMasterBoard(user.tenantId, id, dto);
  }

  @Post('execute')
  @RequirePermissions(PERMISSIONS.WORKFLOW_EXECUTE)
  async execute(@CurrentUser() user: AuthUser, @Body() dto: ExecuteWorkflowStepDto) {
    return this.engineService.executeStep(user, dto);
  }
}
