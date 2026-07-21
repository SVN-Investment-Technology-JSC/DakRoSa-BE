import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @Length(8, 128)
  currentPassword!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @Length(12, 128)
  newPassword!: string;
}
