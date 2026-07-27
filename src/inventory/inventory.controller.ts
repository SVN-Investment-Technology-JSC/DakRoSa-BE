import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { InventoryTransactionDto } from './dto/inventory-transaction.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Request } from 'express';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('materials')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create new material' })
  createMaterial(@Body() createMaterialDto: CreateMaterialDto) {
    return this.inventoryService.createMaterial(createMaterialDto);
  }

  @Get('materials')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all materials' })
  getMaterials() {
    return this.inventoryService.getMaterials();
  }

  @Get(['stock', 'stock/:warehouseId'])
  @RequirePermissions('inventory.view')
  @ApiOperation({
    summary: 'Get current stock in all warehouses or a specific one',
  })
  getInventory(@Param('warehouseId') warehouseId?: string) {
    return this.inventoryService.getInventory(warehouseId);
  }

  @Get('alerts/low-stock')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get low stock alerts based on minStock' })
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Post('transactions')
  @RequirePermissions('inventory.transaction')
  @ApiOperation({ summary: 'Execute an inventory transaction (IMPORT/EXPORT)' })
  executeTransaction(
    @Body() dto: InventoryTransactionDto,
    @Req() req: Request,
  ) {
    // In a real app, user is extracted from req.user
    const user = req.user as { id: string };
    return this.inventoryService.executeTransaction(dto, user?.id);
  }
}
