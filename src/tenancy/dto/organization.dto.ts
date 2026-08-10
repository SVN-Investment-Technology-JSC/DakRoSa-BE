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
  IsDateString,
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

export class CreatePersonnelDto {
  @ApiProperty({ example: 'NV-0001' }) @IsString() @Length(2, 60) @Matches(/^[A-Za-z0-9_-]+$/) employeeCode!: string;
  @ApiProperty() @IsString() @Length(2, 180) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(254) email?: string;
  @ApiPropertyOptional({ example: 'active' }) @IsOptional() @IsString() @MaxLength(30) status?: string;
}

export class CreatePersonnelAssignmentDto {
  @ApiProperty() @IsUUID('4') organizationUnitId!: string;
  @ApiProperty() @IsUUID('4') positionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional({ example: 3 }) @IsOptional() @IsInt() @Min(1) rank?: number;
  @ApiPropertyOptional({ example: '2026-08-10' }) @IsOptional() @IsDateString() startDate?: string;
}

export class UpdatePersonnelAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) rank?: number;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() endDate?: string | null;
}
