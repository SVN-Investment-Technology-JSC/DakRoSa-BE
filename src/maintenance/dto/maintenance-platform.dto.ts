import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MaintenanceStepType,
  MaintenanceTargetType,
  MaintenanceTriggerType,
} from '../../database/entities';

export class MaintenanceJobPlanStepInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  key!: string;

  @IsEnum(MaintenanceStepType)
  type!: MaintenanceStepType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CreateMaintenanceJobPlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(525_600)
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceJobPlanStepInputDto)
  steps!: MaintenanceJobPlanStepInputDto[];
}

export class SaveMaintenanceJobPlanDraftDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(525_600)
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceJobPlanStepInputDto)
  steps!: MaintenanceJobPlanStepInputDto[];
}

export class MaintenanceScheduleTargetInputDto {
  @IsEnum(MaintenanceTargetType)
  targetType!: MaintenanceTargetType;

  @IsUUID()
  targetId!: string;
}

export class MaintenanceTriggerInputDto {
  @IsEnum(MaintenanceTriggerType)
  type!: MaintenanceTriggerType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateMaintenanceScheduleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsUUID()
  jobPlanId!: string;

  @IsUUID()
  workflowDefinitionId!: string;

  @IsOptional()
  @IsUUID()
  defaultAssigneeId?: string;

  @IsOptional()
  @IsUUID()
  defaultTechnicalReviewerId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  timezone!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(525_600, { each: true })
  reminderMinutes?: number[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceScheduleTargetInputDto)
  targets!: MaintenanceScheduleTargetInputDto[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceTriggerInputDto)
  triggers!: MaintenanceTriggerInputDto[];
}

export class PreviewMaintenanceScheduleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  timezone!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(366)
  horizonDays?: number;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceTriggerInputDto)
  triggers!: MaintenanceTriggerInputDto[];
}

export class SkipMaintenanceOccurrenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class MaintenanceCalendarQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateEquipmentMeterDto {
  @IsUUID()
  equipmentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  unit!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rolloverValue?: number;
}

export class CreateMeterReadingDto {
  @IsNumber()
  value!: number;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalId?: string;
}

export class IngestMaintenanceEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  eventKey!: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  externalId!: string;
}
