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
  Query,
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
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  list(@Query() query: UserQueryDto, @CurrentUser() actor: AuthUser) {
    return this.service.list(query, actor);
  }

  @Get('assignable-roles')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  assignableRoles(
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.listAssignableRoles(actor, tenantId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.getById(id, actor, tenantId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.create(dto, actor, context, tenantId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.update(id, dto, actor, context, tenantId);
  }

  @Post(':id/reset-password')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.USERS_RESET_PASSWORD)
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.resetPassword(
      id,
      dto.newPassword,
      actor,
      context,
      tenantId,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @ClientContextParam() context: ClientContext,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.remove(id, actor, context, tenantId);
  }
}
