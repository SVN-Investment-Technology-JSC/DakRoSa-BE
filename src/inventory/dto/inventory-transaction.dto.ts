import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryTransactionDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsNotEmpty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ description: 'Material ID' })
  @IsNotEmpty()
  @IsUUID()
  materialId!: string;

  @ApiProperty({ description: 'Transaction type: IMPORT or EXPORT' })
  @IsNotEmpty()
  @IsIn(['IMPORT', 'EXPORT'])
  type!: 'IMPORT' | 'EXPORT';

  @ApiProperty({ description: 'Quantity to import or export' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Reference ID (e.g. Work Order ID)' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Transaction note' })
  @IsOptional()
  @IsString()
  note?: string;
}
