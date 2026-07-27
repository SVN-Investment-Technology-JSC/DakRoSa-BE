import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateTenantAdminDto extends OmitType(CreateUserDto, [
  'roleIds',
] as const) {}
