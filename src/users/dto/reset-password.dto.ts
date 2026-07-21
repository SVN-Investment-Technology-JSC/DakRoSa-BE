import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ writeOnly: true, minLength: 12 })
  @IsString()
  @Length(12, 128)
  newPassword!: string;
}
