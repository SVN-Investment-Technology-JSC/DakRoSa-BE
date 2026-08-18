import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsUUID,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryTransactionType } from '../../database/entities/inventory-transaction.entity';

export class InventoryTransactionDto {
  @ApiPropertyOptional({ description: 'Transaction code (e.g. NK-2026-001, XK-2026-005)' })
  @IsOptional()
  @IsString()
  transactionCode?: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsNotEmpty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional({ description: 'Specific shelf/bin location ID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Material ID' })
  @IsNotEmpty()
  @IsUUID()
  materialId!: string;

  @ApiProperty({
    description:
      'Transaction type: IMPORT, EXPORT, TRANSFER, BORROW, RETURN, ADJUST, IN, OUT',
  })
  @IsNotEmpty()
  @IsIn([
    'IMPORT',
    'EXPORT',
    'TRANSFER',
    'BORROW',
    'RETURN',
    'ADJUST',
    'IN',
    'OUT',
  ])
  type!: InventoryTransactionType;

  @ApiProperty({ description: 'Quantity to transact' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Reference type: WORK_ORDER, PURCHASE_ORDER, OPERATION',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID (e.g. Work Order ID, Purchase Order ID)' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Workflow Request ID from Approval Engine' })
  @IsOptional()
  @IsUUID()
  workflowRequestId?: string;

  @ApiPropertyOptional({ description: 'Transaction note' })
  @IsOptional()
  @IsString()
  note?: string;
}
