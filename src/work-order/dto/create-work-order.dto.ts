import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WorkOrderType,
  WorkOrderStatus,
} from '../../database/entities/work-order.entity';

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Work Order Code' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Title of the work order' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkOrderType })
  @IsNotEmpty()
  @IsEnum(WorkOrderType)
  type!: WorkOrderType;

  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Equipment ID' })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'Assignee User ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
