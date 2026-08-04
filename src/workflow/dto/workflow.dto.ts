import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, ValidateNested, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowNodeType } from '../../database/entities/workflow-node.entity';

export class CreateWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  resourceType?: string;
}

export class WorkflowAssigneeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  nodeId?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  subjectId?: string | null;

  @IsString()
  @IsOptional()
  fieldKey?: string | null;

  @IsString()
  @IsNotEmpty()
  strategy!: string;

  @IsNumber()
  @IsOptional()
  quorum?: number | null;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}



export class WorkflowNodeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  type!: WorkflowNodeType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  uiPosition?: { x?: number; y?: number };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowAssigneeDto)
  @IsOptional()
  assignees?: WorkflowAssigneeDto[];
}

export class WorkflowTransitionDto {
  @IsString()
  @IsOptional()
  sourceKey?: string;

  @IsString()
  @IsOptional()
  targetKey?: string;

  @IsString()
  @IsNotEmpty()
  actionKey!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsObject()
  @IsOptional()
  condition?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class DraftWorkflowVersionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes!: WorkflowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTransitionDto)
  transitions!: WorkflowTransitionDto[];

  @IsString()
  @IsOptional()
  changelog?: string;
}

export class WorkflowRoleMappingDto {
  @IsString()
  @IsNotEmpty()
  variableKey!: string;

  @IsString()
  @IsNotEmpty()
  mappedType!: string;

  @IsString()
  @IsNotEmpty()
  mappedValue!: string;
}

export class UpdateMasterBoardDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowRoleMappingDto)
  mappings!: WorkflowRoleMappingDto[];
}

export class UpdateMasterBoardCellDto {
  @IsString()
  @IsNotEmpty()
  workflowId!: string;

  @IsString()
  @IsNotEmpty()
  variableKey!: string;

  @IsString()
  @IsNotEmpty()
  mappedType!: string;

  @IsString()
  @IsNotEmpty()
  mappedValue!: string;
}

export class CloneWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class ExecuteWorkflowStepDto {
  @IsString()
  @IsNotEmpty()
  workOrderId!: string;

  @IsString()
  @IsNotEmpty()
  stepKey!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsObject()
  @IsOptional()
  formData?: Record<string, unknown>;
}
