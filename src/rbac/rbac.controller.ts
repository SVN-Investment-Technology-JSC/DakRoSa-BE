import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../common/constants/permissions';
import {
  ClientContextParam,
  ClientContext,
} from '../common/decorators/client-context.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RbacService } from './rbac.service';

@ApiTags('Roles & permissions')
@ApiBearerAuth()
@Controller({ path: 'rbac', version: '1' })
export class RbacController {
  constructor(private readonly service: RbacService) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  roles() {
    return this.service.listRoles();
  }

  @Get('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  role(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getRole(id);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  permissions() {
    return this.service.listPermissions();
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.create(dto, actor, context);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.update(id, dto, actor, context);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_ASSIGN_PERMISSIONS)
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.assignPermissions(
      id,
      dto.permissionKeys,
      actor,
      context,
    );
  }

  @Delete('roles/:id')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.remove(id, actor, context);
  }
}
