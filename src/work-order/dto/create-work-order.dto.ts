import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
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

  @ApiPropertyOptional({ description: 'Technical reviewer user ID' })
  @IsOptional()
  @IsUUID()
  technicalReviewerId?: string;

  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Workflow definition ID' })
  @IsOptional()
  @IsUUID()
  workflowDefinitionId?: string;

  @ApiPropertyOptional({ description: 'Maintenance schedule ID' })
  @IsOptional()
  @IsUUID()
  maintenanceScheduleId?: string;

  @ApiPropertyOptional({ description: 'Maintenance occurrence ID' })
  @IsOptional()
  @IsUUID()
  maintenanceOccurrenceId?: string;

  @ApiPropertyOptional({ description: 'Job plan version ID' })
  @IsOptional()
  @IsUUID()
  jobPlanVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority?: string;
}
