import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { PERMISSIONS } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireTenantModules } from '../common/decorators/tenant-module.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CloneWorkflowDefinitionDto,
  CreateWorkflowDefinitionDto,
  ResolveWorkflowRoleMappingsDto,
  SaveWorkflowDraftDto,
  SaveWorkflowRoleMappingsDto,
  WorkflowActionDto,
} from './dto/workflow-definition.dto';
import { WorkflowService } from './workflow.service';

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(TenantModuleGuard)
@RequireTenantModules('cmms')
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('definitions')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  list(@CurrentUser() user: AuthUser) {
    return this.service.listDefinitions(user.tenantId);
  }

  @Get('definitions/archived')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  listArchived(@CurrentUser() user: AuthUser) {
    return this.service.listArchivedDefinitions(user.tenantId);
  }

  @Post('definitions')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  create(
    @Body() dto: CreateWorkflowDefinitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createDefinition(user.tenantId, user.id, dto);
  }

  @Get('definitions/:id')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getDefinition(user.tenantId, id);
  }

  @Put('definitions/:id/draft')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveWorkflowDraftDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.saveDraft(user.tenantId, id, user.id, dto);
  }

  @Post('definitions/:id/validate')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  validate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.validateDefinition(user.tenantId, id);
  }

  @Post('definitions/:id/publish')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_PUBLISH)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.publishDefinition(user.tenantId, id, user.id);
  }

  @Post('definitions/:id/clone')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneWorkflowDefinitionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cloneDefinition(user.tenantId, id, user.id, dto);
  }

  @Patch('definitions/:id/archive')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archiveDefinition(user.tenantId, id);
  }

  @Patch('definitions/:id/restore')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.restoreDefinition(user.tenantId, id);
  }

  @Delete('definitions/:id/permanent')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  deletePermanently(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteDefinitionPermanently(user.tenantId, id);
  }

  @Get('definitions/:id/master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  masterBoard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getRoleMappings(user.tenantId, id);
  }

  @Get('master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  globalMasterBoard(@CurrentUser() user: AuthUser) {
    return this.service.getGlobalMasterBoard(user.tenantId);
  }

  @Put('definitions/:id/master-board')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_MANAGE)
  saveMasterBoard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveWorkflowRoleMappingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.saveRoleMappings(user.tenantId, id, dto);
  }

  @Post('definitions/:id/master-board/resolve')
  @RequirePermissions(PERMISSIONS.WORKFLOW_DEFINITION_VIEW)
  resolveMasterBoard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveWorkflowRoleMappingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resolveRoleMappings(user.tenantId, id, dto);
  }

  @Get('instances/:id')
  @RequirePermissions(PERMISSIONS.WORK_ORDER_VIEW)
  instance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getInstance(user.tenantId, id, user);
  }

  @Post('instances/:id/actions')
  @RequirePermissions(PERMISSIONS.WORK_ORDER_UPDATE)
  act(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WorkflowActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.performAction(user.tenantId, id, user, dto);
  }

  @Get('work-items/mine')
  @RequirePermissions(PERMISSIONS.WORK_ITEMS_VIEW)
  workItems(@CurrentUser() user: AuthUser) {
    return this.service.workItems(user);
  }
}
