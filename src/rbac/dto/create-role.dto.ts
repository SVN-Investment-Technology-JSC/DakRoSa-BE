import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'operator' })
  @IsString()
  @Length(2, 60)
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty({ example: 'Nhân viên vận hành' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
