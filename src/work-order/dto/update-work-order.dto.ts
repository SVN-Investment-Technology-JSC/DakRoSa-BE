import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  downtimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
}
