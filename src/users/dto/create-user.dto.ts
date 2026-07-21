import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'vanhanh01' })
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  username!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @Length(2, 150)
  displayName!: string;

  @ApiProperty({ required: false, example: 'Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  shortName?: string;

  @ApiProperty({ example: 'example@email.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @Length(7, 30)
  @Matches(/^[0-9+().\s-]+$/)
  phone!: string;

  @ApiProperty({ required: false, example: '123 Đường ABC, TP.HCM' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString({ strict: true })
  joinedAt!: string;

  @ApiProperty({ required: false, example: 'Ca hành chính' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workShift?: string;

  @ApiProperty({ writeOnly: true, minLength: 12 })
  @IsString()
  @Length(12, 128)
  password!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
