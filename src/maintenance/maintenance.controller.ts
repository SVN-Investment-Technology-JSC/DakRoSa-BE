import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermissions('maintenance.create')
  @ApiOperation({ summary: 'Create new maintenance plan' })
  create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto);
  }

  @Get()
  @RequirePermissions('maintenance.view')
  @ApiOperation({ summary: 'Get all maintenance plans' })
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  @RequirePermissions('maintenance.view')
  @ApiOperation({ summary: 'Get maintenance plan details' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.update')
  @ApiOperation({ summary: 'Update maintenance plan' })
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('maintenance.delete')
  @ApiOperation({ summary: 'Delete maintenance plan' })
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
