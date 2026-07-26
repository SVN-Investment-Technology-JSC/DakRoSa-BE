import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitSubmissionDto {
  @IsUUID()
  assigneeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
