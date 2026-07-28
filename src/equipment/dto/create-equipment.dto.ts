import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEquipmentDto {
  @ApiPropertyOptional({ description: 'Parent equipment ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'Unique equipment code' })
  @IsNotEmpty()
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Equipment name' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Equipment category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Status of equipment' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Installation date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  installationDate?: string;

  @ApiPropertyOptional({ description: 'Technical specifications' })
  @IsOptional()
  @IsObject()
  specs?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional description' })
  @IsOptional()
  @IsString()
  description?: string;
}
