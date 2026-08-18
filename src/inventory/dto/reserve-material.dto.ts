import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReserveMaterialDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsNotEmpty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ description: 'Material ID' })
  @IsNotEmpty()
  @IsUUID()
  materialId!: string;

  @ApiPropertyOptional({ description: 'Location ID (Shelf / Bin)' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Quantity to reserve' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Reference ID (e.g. Work Order ID)' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Reservation note' })
  @IsOptional()
  @IsString()
  note?: string;
}
