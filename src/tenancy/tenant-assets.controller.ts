import { Controller, Get, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { TenancyService } from './tenancy.service';

@ApiTags('Tenant assets')
@Controller({ path: 'tenant-assets', version: '1' })
export class TenantAssetsController {
  constructor(private readonly service: TenancyService) {}

  @Public()
  @Get(':tenantId/logo')
  async logo(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    const logo = await this.service.getTenantLogo(tenantId);
    return new StreamableFile(logo.stream, {
      type: logo.contentType,
      disposition: 'inline',
      length: undefined,
    });
  }
}
