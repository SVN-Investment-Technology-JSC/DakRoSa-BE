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

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @RequirePermissions('equipment.create')
  @ApiOperation({ summary: 'Create new equipment' })
  create(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.create(createEquipmentDto);
  }

  @Get('tree')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment tree' })
  findTree() {
    return this.equipmentService.findTree();
  }

  @Get()
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get all equipment' })
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  @RequirePermissions('equipment.view')
  @ApiOperation({ summary: 'Get equipment by id' })
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('equipment.update')
  @ApiOperation({ summary: 'Update equipment' })
  update(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(id, updateEquipmentDto);
  }

  @Delete(':id')
  @RequirePermissions('equipment.delete')
  @ApiOperation({ summary: 'Delete equipment' })
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
}
