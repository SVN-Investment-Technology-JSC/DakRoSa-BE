import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { InventoryTransactionDto } from './dto/inventory-transaction.dto';
import { ReserveMaterialDto } from './dto/reserve-material.dto';
import { CreateWarehouseLocationDto } from './dto/create-warehouse-location.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { RequireTenantModules } from '../common/decorators/tenant-module.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(TenantModuleGuard)
@RequireTenantModules('cmms')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('materials')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create new material' })
  createMaterial(
    @Body() createMaterialDto: CreateMaterialDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.createMaterial(
      user.tenantId,
      createMaterialDto,
    );
  }

  @Get('materials')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all materials' })
  getMaterials(@CurrentUser() user: AuthUser) {
    return this.inventoryService.getMaterials(user.tenantId);
  }

  @Post('warehouses/:warehouseId/locations')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Create a new shelf/bin location in warehouse' })
  createLocation(
    @Param('warehouseId') warehouseId: string,
    @Body() dto: CreateWarehouseLocationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.createLocation(user.tenantId, warehouseId, dto);
  }

  @Get('warehouses/:warehouseId/locations')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get all locations in warehouse' })
  getLocations(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.getLocations(user.tenantId, warehouseId);
  }

  @Get(['stock', 'stock/:warehouseId'])
  @RequirePermissions('inventory.view')
  @ApiOperation({
    summary: 'Get current stock in all warehouses or a specific one',
  })
  getInventory(
    @CurrentUser() user: AuthUser,
    @Param('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getInventory(user.tenantId, warehouseId);
  }

  @Get('alerts/low-stock')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Get low stock alerts based on minStock' })
  getLowStockAlerts(@CurrentUser() user: AuthUser) {
    return this.inventoryService.getLowStockAlerts(user.tenantId);
  }

  @Post('reserve')
  @RequirePermissions('inventory.transaction')
  @ApiOperation({ summary: 'Reserve material for Work Order' })
  reserveMaterial(
    @Body() dto: ReserveMaterialDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.reserveMaterial(user.tenantId, dto, user.id);
  }

  @Post('transactions')
  @RequirePermissions('inventory.transaction')
  @ApiOperation({ summary: 'Execute an inventory transaction (IMPORT/EXPORT/TRANSFER/BORROW/RETURN)' })
  executeTransaction(
    @Body() dto: InventoryTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.executeTransaction(
      user.tenantId,
      dto,
      user.id,
    );
  }
}
