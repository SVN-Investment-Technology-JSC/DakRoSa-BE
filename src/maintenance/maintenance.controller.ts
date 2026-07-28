import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermissions('maintenance.create')
  @ApiOperation({ summary: 'Create new maintenance plan' })
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.maintenanceService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('maintenance.view')
  @ApiOperation({ summary: 'Get all maintenance plans' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.maintenanceService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('maintenance.view')
  @ApiOperation({ summary: 'Get maintenance plan details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.maintenanceService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.update')
  @ApiOperation({ summary: 'Update maintenance plan' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.maintenanceService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('maintenance.delete')
  @ApiOperation({ summary: 'Delete maintenance plan' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.maintenanceService.remove(user.tenantId, id);
  }
}
