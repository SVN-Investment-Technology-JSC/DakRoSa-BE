import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  SUBMISSION_PRIORITIES,
  SubmissionPriority,
} from '../../database/entities';

export class UpdateSubmissionDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(220)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  documentType?: string;

  @IsOptional()
  @IsIn(SUBMISSION_PRIORITIES)
  priority?: SubmissionPriority;

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
