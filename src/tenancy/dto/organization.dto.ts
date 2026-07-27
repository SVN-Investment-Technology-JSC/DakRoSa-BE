import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrganizationUnitDto {
  @ApiProperty({ example: 'KHTH' })
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  name!: string;

  @ApiPropertyOptional({ example: 'department' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateOrganizationUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 180)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePositionDto {
  @ApiProperty({ example: 'TRUONG_PHONG' })
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  organizationUnitId?: string | null;
}

export class UpdatePositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 180)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  organizationUnitId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
