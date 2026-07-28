import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrderService } from './work-order.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Post()
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Create new work order' })
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: AuthUser) {
    return this.workOrderService.create(user.tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get all work orders' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.workOrderService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workOrderService.findOne(user.tenantId, id);
  }

  @Get('equipment/:equipmentId')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work orders by equipment' })
  findByEquipment(@Param('equipmentId') equipmentId: string, @CurrentUser() user: AuthUser) {
    return this.workOrderService.findByEquipment(user.tenantId, equipmentId);
  }

  @Patch(':id')
  @RequirePermissions('work_order.update')
  @ApiOperation({ summary: 'Update work order status/details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrderService.update(user.tenantId, id, dto, user.id);
  }

  @Get(':id/materials')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get materials for a work order' })
  getMaterials(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workOrderService.getMaterials(user.tenantId, id);
  }

  @Post(':id/materials')
  @RequirePermissions('work_order.update')
  @ApiOperation({ summary: 'Add material to work order' })
  addMaterial(
    @Param('id') id: string,
    @Body() dto: { materialId: string; warehouseId: string; quantity: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrderService.addMaterial(user.tenantId, id, dto.materialId, dto.warehouseId, dto.quantity, user.id);
  }

  @Delete(':id/materials/:warehouseId/:materialId')
  @RequirePermissions('work_order.update')
  @ApiOperation({ summary: 'Remove material from work order' })
  removeMaterial(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrderService.removeMaterial(user.tenantId, id, materialId, warehouseId, user.id);
  }

  @Get(':id/logs')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order logs' })
  getLogs(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workOrderService.getLogs(user.tenantId, id);
  }
}
