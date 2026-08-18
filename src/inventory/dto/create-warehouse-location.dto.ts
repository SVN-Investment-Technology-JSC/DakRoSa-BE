import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseLocationDto {
  @ApiProperty({ description: 'Location code (e.g. KE-01-T2-BIN03)' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Location name (e.g. Kệ 1 - Tầng 2 - Ngăn 3)' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description / Dimensions / Notes' })
  @IsOptional()
  @IsString()
  description?: string;
}
