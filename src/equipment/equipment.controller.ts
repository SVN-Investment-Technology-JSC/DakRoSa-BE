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
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @RequirePermissions('equipment.create')
  @ApiOperation({ summary: 'Create new equipment' })
  create(@CurrentUser() user: AuthUser, @Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.create(user.tenantId, createEquipmentDto);
  }

  @Get('tree')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment tree' })
  findTree(@CurrentUser() user: AuthUser) {
    return this.equipmentService.findTree(user.tenantId);
  }

  @Get()
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get all equipment' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.equipmentService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment by id' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.equipmentService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('equipment.update')
  @ApiOperation({ summary: 'Update equipment' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(user.tenantId, id, updateEquipmentDto);
  }

  @Post(':id/documents')
  @RequirePermissions('equipment.update')
  @ApiOperation({ summary: 'Add document to equipment' })
  addDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() documentData: { name: string; type?: string; fileUrl: string; description?: string },
  ) {
    return this.equipmentService.addDocument(user.tenantId, id, documentData);
  }

  @Get(':id/documents')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment documents' })
  getDocuments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.equipmentService.getDocuments(user.tenantId, id);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('equipment.update')
  @ApiOperation({ summary: 'Remove document from equipment' })
  removeDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.equipmentService.removeDocument(user.tenantId, id, docId);
  }

  @Delete(':id')
  @RequirePermissions('equipment.delete')
  @ApiOperation({ summary: 'Delete equipment' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.equipmentService.remove(user.tenantId, id);
  }
}
