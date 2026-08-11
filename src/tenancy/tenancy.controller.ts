import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../common/constants/permissions';
import {
  ClientContext,
  ClientContextParam,
} from '../common/decorators/client-context.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireTenantModules } from '../common/decorators/tenant-module.decorator';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CreateOrganizationUnitDto,
  CreatePositionDto,
  UpdateOrganizationUnitDto,
  UpdatePositionDto,
  CreatePersonnelDto,
  CreatePersonnelAssignmentDto,
  CreateAndAssignPersonnelDto,
  UpdatePersonnelAssignmentDto,
} from './dto/organization.dto';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenancyService } from './tenancy.service';

@ApiTags('Tenant context')
@ApiBearerAuth()
@Controller({ path: 'tenancy', version: '1' })
export class TenancyController {
  constructor(private readonly service: TenancyService) {}

  @Get('bootstrap')
  bootstrap(@CurrentUser() user: AuthUser) {
    return this.service.bootstrap(user.tenantId);
  }

  @Get('settings')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('administration')
  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_VIEW)
  settings(@CurrentUser() user: AuthUser) {
    return this.service.getSettings(user);
  }

  @Patch('settings')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('administration')
  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_UPDATE)
  updateSettings(
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.updateSettings(dto, user, context);
  }

  @Get('sites')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('administration')
  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_VIEW)
  listSites(@CurrentUser() user: AuthUser) {
    return this.service.listSites(user);
  }

  @Post('sites')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('administration')
  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_UPDATE)
  createSite(
    @Body() dto: CreateSiteDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.createSite(dto, user, context);
  }

  @Patch('sites/:id')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('administration')
  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_UPDATE)
  updateSite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.updateSite(id, dto, user, context);
  }

  @Get('organization')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_VIEW)
  organization(@CurrentUser() user: AuthUser) {
    return this.service.listOrganization(user);
  }

  @Get('organization/tree')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_VIEW)
  organizationTree(@CurrentUser() user: AuthUser) {
    return this.service.organizationTree(user);
  }

  @Post('organization/personnel')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  createPersonnel(@Body() dto: CreatePersonnelDto, @CurrentUser() user: AuthUser, @ClientContextParam() context: ClientContext) {
    return this.service.createPersonnel(dto, user, context);
  }

  @Post('organization/personnel/appoint')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  createAndAssignPersonnel(@Body() dto: CreateAndAssignPersonnelDto, @CurrentUser() user: AuthUser, @ClientContextParam() context: ClientContext) {
    return this.service.createAndAssignPersonnel(dto, user, context);
  }

  @Post('organization/personnel/:employeeCode/assignments')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  createPersonnelAssignment(@Param('employeeCode') employeeCode: string, @Body() dto: CreatePersonnelAssignmentDto, @CurrentUser() user: AuthUser, @ClientContextParam() context: ClientContext) {
    return this.service.createPersonnelAssignment(employeeCode, dto, user, context);
  }

  @Patch('organization/personnel/:employeeCode/assignments/:assignmentId')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  updatePersonnelAssignment(@Param('employeeCode') employeeCode: string, @Param('assignmentId', ParseUUIDPipe) assignmentId: string, @Body() dto: UpdatePersonnelAssignmentDto, @CurrentUser() user: AuthUser, @ClientContextParam() context: ClientContext) {
    return this.service.updatePersonnelAssignment(employeeCode, assignmentId, dto, user, context);
  }

  @Post('organization/units')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  createOrganizationUnit(
    @Body() dto: CreateOrganizationUnitDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.createOrganizationUnit(dto, user, context);
  }

  @Patch('organization/units/:id')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  updateOrganizationUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationUnitDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.updateOrganizationUnit(id, dto, user, context);
  }

  @Delete('organization/units/:id')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  removeOrganizationUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.removeOrganizationUnit(id, user, context);
  }

  @Post('organization/positions')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  createPosition(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.createPosition(dto, user, context);
  }

  @Patch('organization/positions/:id')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.updatePosition(id, dto, user, context);
  }

  @Delete('organization/positions/:id')
  @UseGuards(TenantModuleGuard)
  @RequireTenantModules('organization')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  removePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.removePosition(id, user, context);
  }
}
