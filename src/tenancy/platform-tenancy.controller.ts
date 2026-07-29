import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { PermanentlyDeleteTenantDto } from './dto/permanently-delete-tenant.dto';
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

  @Get('archived')
  listArchived() {
    return this.service.listArchivedPlatformTenants();
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

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.archivePlatformTenant(id, actor, context);
  }

  @Post(':id/restore')
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.restorePlatformTenant(id, actor, context);
  }

  @Delete(':id/permanent')
  permanentlyDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PermanentlyDeleteTenantDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.permanentlyDeletePlatformTenant(
      id,
      dto.confirmation,
      actor,
      context,
    );
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.uploadPlatformTenantLogo(id, file, actor, context);
  }

  @Delete(':id/logo')
  removeLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.removePlatformTenantLogo(id, actor, context);
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
