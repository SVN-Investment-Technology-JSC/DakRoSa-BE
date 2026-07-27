import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  TENANT_MODULES,
  TenantModuleKey,
} from '../../common/constants/tenant-modules';

export class CreateTenantDto {
  @ApiProperty({ example: 'nha-may-a' })
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ example: 'NMA' })
  @IsString()
  @Length(2, 40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  shortName!: string;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ example: '#386948' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ type: [String], enum: TENANT_MODULES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TENANT_MODULES.length)
  @IsIn(TENANT_MODULES, { each: true })
  enabledModules?: TenantModuleKey[];
}
