import { Controller, Get } from '@nestjs/common';
import { PersonnelService } from './personnel.service';

@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Get('organization-tree')
  getOrganizationTree() {
    return this.personnelService.getOrganizationTree();
  }
}
