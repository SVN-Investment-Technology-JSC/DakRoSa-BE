import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
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
  WorkflowAssigneeType,
  WorkflowNodeType,
  WorkflowRoleMappingTargetType,
} from '../../database/entities';

export class CreateWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z0-9][a-z0-9-]*$/)
  key!: string;

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
  resourceType?: string;
}

export class CloneWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z0-9][a-z0-9-]*$/)
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;
}

export class WorkflowAssigneeRuleInputDto {
  @IsEnum(WorkflowAssigneeType)
  type!: WorkflowAssigneeType;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fieldKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.-]*$/)
  assigneeVariableKey?: string;

  @IsOptional()
  @IsIn(['ANY', 'ALL', 'QUORUM'])
  strategy?: 'ANY' | 'ALL' | 'QUORUM';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quorum?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class WorkflowNodeInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  key!: string;

  @IsEnum(WorkflowNodeType)
  type!: WorkflowNodeType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  uiPosition?: { x?: number; y?: number };

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => WorkflowAssigneeRuleInputDto)
  assignees!: WorkflowAssigneeRuleInputDto[];
}

export class WorkflowTransitionInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  sourceKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  targetKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)
  actionKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SaveWorkflowDraftDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeInputDto)
  nodes!: WorkflowNodeInputDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => WorkflowTransitionInputDto)
  transitions!: WorkflowTransitionInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changelog?: string;
}

export class WorkflowActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  actionKey!: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class WorkflowRoleMappingInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.-]*$/)
  variableKey!: string;

  @IsEnum(WorkflowRoleMappingTargetType)
  targetType!: WorkflowRoleMappingTargetType;

  @IsUUID()
  targetId!: string;
}

export class SaveWorkflowRoleMappingsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((mapping: WorkflowRoleMappingInputDto) => mapping.variableKey)
  @ValidateNested({ each: true })
  @Type(() => WorkflowRoleMappingInputDto)
  mappings!: WorkflowRoleMappingInputDto[];
}

export class ResolveWorkflowRoleMappingsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.-]*$/, { each: true })
  variableKeys!: string[];
}
