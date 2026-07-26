import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { SignaturesService } from './signatures.service';

@ApiTags('Digital signatures')
@ApiBearerAuth()
@UseGuards(TenantModuleGuard)
@RequireTenantModules('digital-signature')
@Controller({ path: 'signatures', version: '1' })
export class SignaturesController {
  constructor(private readonly service: SignaturesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SIGNATURES_VIEW)
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SIGNATURES_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(id, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SIGNATURES_REQUEST)
  create(
    @Body() dto: CreateSignatureRequestDto,
    @CurrentUser() user: AuthUser,
    @ClientContextParam() context: ClientContext,
  ) {
    return this.service.create(dto, user, context);
  }
}
