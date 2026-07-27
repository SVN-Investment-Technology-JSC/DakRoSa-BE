import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import {
  ClientContext,
  ClientContextParam,
} from '../common/decorators/client-context.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlatformAdminOnly } from '../common/decorators/platform-admin.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenancyService } from './tenancy.service';

@ApiTags('Platform administration')
@ApiBearerAuth()
@PlatformAdminOnly()
@UseGuards(PlatformAdminGuard)
@Controller({ path: 'platform/tenants', version: '1' })
export class PlatformTenancyController {
  constructor(private readonly service: TenancyService) {}

  @Get()
  list() {
    return this.service.listPlatformTenants();
  }

  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.createPlatformTenant(dto, actor, context);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.updatePlatformTenant(id, dto, actor, context);
  }

  @Post(':tenantId/admins')
  createTenantAdmin(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateTenantAdminDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.createPlatformTenantAdmin(
      tenantId,
      dto,
      actor,
      context,
    );
  }

  @Get(':tenantId/sites')
  listSites(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.platformListSites(tenantId);
  }

  @Post(':tenantId/sites')
  createSite(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateSiteDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.platformCreateSite(tenantId, dto, actor, context);
  }

  @Patch(':tenantId/sites/:id')
  updateSite(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.platformUpdateSite(tenantId, id, dto, actor, context);
  }
}
