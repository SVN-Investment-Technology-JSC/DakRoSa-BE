import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiProperty({ description: 'Unique material code' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Material name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Material category: SPARE_PART, CONSUMABLE, TOOL, RAW_MATERIAL' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsNotEmpty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ description: 'Specifications / Technical standards' })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Minimum stock level warning threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ description: 'Maximum stock limit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;
}
