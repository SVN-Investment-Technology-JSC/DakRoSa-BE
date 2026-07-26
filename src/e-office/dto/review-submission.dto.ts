import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn(['approve', 'return'])
  decision!: 'approve' | 'return';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
