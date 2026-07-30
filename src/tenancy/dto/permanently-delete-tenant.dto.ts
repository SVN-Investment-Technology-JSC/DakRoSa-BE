import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class PermanentlyDeleteTenantDto {
  @ApiProperty({ description: 'Exact tenant code or name shown in the UI.' })
  @IsString()
  @Length(2, 180)
  confirmation!: string;
}
