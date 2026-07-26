import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SUBMISSION_PRIORITIES,
  SUBMISSION_STATUSES,
  SubmissionPriority,
  SubmissionStatus,
} from '../../database/entities';

export class SubmissionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(SUBMISSION_STATUSES)
  status?: SubmissionStatus;

  @IsOptional()
  @IsIn(SUBMISSION_PRIORITIES)
  priority?: SubmissionPriority;

  @IsOptional()
  @IsIn(['all', 'created-by-me', 'assigned-to-me'])
  scope: 'all' | 'created-by-me' | 'assigned-to-me' = 'all';
}
