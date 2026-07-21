import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], example: ['dashboard.view', 'users.view'] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+\.[a-z0-9-]+$/, { each: true })
  permissionKeys!: string[];
}
