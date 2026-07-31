import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkOrderUpdateType } from '../../database/entities';

export class CreateWorkOrderUpdateDto {
  @IsEnum(WorkOrderUpdateType)
  type!: WorkOrderUpdateType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  note!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class UpdateWorkOrderChecklistDto {
  @IsUUID()
  stepId!: string;

  @IsIn(['pending', 'passed', 'failed', 'not_applicable'])
  status!: 'pending' | 'passed' | 'failed' | 'not_applicable';

  @IsObject()
  value!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
