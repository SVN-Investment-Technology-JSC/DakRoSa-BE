import { IsString, Matches, MaxLength } from 'class-validator';

export class SwitchTenantDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug!: string;
}
