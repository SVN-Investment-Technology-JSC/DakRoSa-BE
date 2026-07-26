import { IsUUID } from 'class-validator';

export class CreateSignatureRequestDto {
  @IsUUID()
  submissionId!: string;
}
