import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Equipment ID' })
  @IsNotEmpty()
  @IsUUID()
  equipmentId!: string;

  @ApiProperty({ description: 'Title of the maintenance plan' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Description/Tasks' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Frequency in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  frequencyDays?: number;

  @ApiPropertyOptional({ description: 'Next due date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  nextDueDate?: string;
}
