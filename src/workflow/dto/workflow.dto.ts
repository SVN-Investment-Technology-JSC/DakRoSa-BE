import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  ASSIGNEE_TYPES,
  AssigneeType,
  ASSIGNMENT_STRATEGIES,
  AssignmentStrategy,
  WORKFLOW_NODE_TYPES,
  WorkflowNodeType,
  WorkflowFormSchema,
} from '../../database/entities/workflow-node.entity';
import {
  TRANSITION_CONDITIONS,
  TransitionCondition,
} from '../../database/entities/workflow-transition.entity';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class CreateWorkflowNodeDto {
  @IsString()
  stepKey!: string;

  @IsString()
  name!: string;

  @IsEnum(WORKFLOW_NODE_TYPES)
  type!: WorkflowNodeType;

  @IsOptional()
  @IsEnum(ASSIGNEE_TYPES)
  assigneeType?: AssigneeType;

  @IsOptional()
  @IsString()
  assigneeValue?: string;

  @IsEnum(ASSIGNMENT_STRATEGIES)
  assignmentStrategy: AssignmentStrategy = 'ANY';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  slaMinutes?: number;

  @IsOptional()
  formSchema?: WorkflowFormSchema;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPermissions?: string[];

  @IsOptional()
  positionX?: number;

  @IsOptional()
  positionY?: number;
}

export class CreateWorkflowTransitionDto {
  @IsString()
  sourceStepKey!: string;

  @IsString()
  targetStepKey!: string;

  @IsEnum(TRANSITION_CONDITIONS)
  condition: TransitionCondition = 'DEFAULT';

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateWorkflowTemplateDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startStepKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowNodeDto)
  nodes!: CreateWorkflowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTransitionDto)
  transitions!: CreateWorkflowTransitionDto[];
}

export class ExecuteWorkflowStepDto {
  @IsUUID()
  workOrderId!: string;

  @IsString()
  stepKey!: string;

  @IsEnum(['APPROVED', 'REJECTED'])
  action!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  note?: string;

  /** Kết quả form_schema: { "result_note": "...", "passed": true, "evidence": "url" } */
  @IsOptional()
  formData?: Record<string, unknown>;
}
