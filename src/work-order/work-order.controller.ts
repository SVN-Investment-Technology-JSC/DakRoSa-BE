import { Controller, Get, Post, Body, Patch, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrderService } from './work-order.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Request } from 'express';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Post()
  @RequirePermissions('work_order.create')
  @ApiOperation({ summary: 'Create new work order' })
  create(@Body() dto: CreateWorkOrderDto, @Req() req: Request) {
    const user = req.user as any;
    return this.workOrderService.create(dto, user?.id);
  }

  @Get()
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get all work orders' })
  findAll() {
    return this.workOrderService.findAll();
  }

  @Get(':id')
  @RequirePermissions('work_order.view')
  @ApiOperation({ summary: 'Get work order details' })
  findOne(@Param('id') id: string) {
    return this.workOrderService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('work_order.update')
  @ApiOperation({ summary: 'Update work order status/details' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto, @Req() req: Request) {
    const user = req.user as any;
    return this.workOrderService.update(id, dto, user?.id);
  }
}
