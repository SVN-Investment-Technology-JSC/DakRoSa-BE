import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantModuleGuard } from '../auth/guards/tenant-module.guard';
import { PERMISSIONS } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireTenantModules } from '../common/decorators/tenant-module.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CreateEquipmentMeterDto,
  CreateMaintenanceJobPlanDto,
  CreateMaintenanceScheduleDto,
  CreateMeterReadingDto,
  IngestMaintenanceEventDto,
  MaintenanceCalendarQueryDto,
  PreviewMaintenanceScheduleDto,
  SaveMaintenanceJobPlanDraftDto,
  SkipMaintenanceOccurrenceDto,
} from './dto/maintenance-platform.dto';
import { EquipmentMeterService } from './equipment-meter.service';
import { MaintenanceJobPlanService } from './maintenance-job-plan.service';
import { MaintenanceSchedulingService } from './maintenance-scheduling.service';

@ApiTags('Maintenance Platform')
@ApiBearerAuth()
@UseGuards(TenantModuleGuard)
@RequireTenantModules('cmms')
@Controller('maintenance')
export class MaintenancePlatformController {
  constructor(
    private readonly jobPlans: MaintenanceJobPlanService,
    private readonly scheduling: MaintenanceSchedulingService,
    private readonly meters: EquipmentMeterService,
  ) {}

  @Get('job-plans')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_VIEW)
  listJobPlans(@CurrentUser() user: AuthUser) {
    return this.jobPlans.list(user.tenantId);
  }

  @Post('job-plans')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_MANAGE)
  createJobPlan(
    @Body() dto: CreateMaintenanceJobPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobPlans.create(user.tenantId, user.id, dto);
  }

  @Get('job-plans/:id')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_VIEW)
  getJobPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobPlans.get(user.tenantId, id);
  }

  @Put('job-plans/:id/draft')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_MANAGE)
  saveJobPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveMaintenanceJobPlanDraftDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobPlans.saveDraft(user.tenantId, id, dto);
  }

  @Post('job-plans/:id/publish')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_PUBLISH)
  publishJobPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobPlans.publish(user.tenantId, id, user.id);
  }

  @Patch('job-plans/:id/archive')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_JOB_PLAN_MANAGE)
  archiveJobPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.jobPlans.archive(user.tenantId, id);
  }

  @Get('schedules')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW)
  listSchedules(@CurrentUser() user: AuthUser) {
    return this.scheduling.listSchedules(user.tenantId);
  }

  @Post('schedules')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  createSchedule(
    @Body() dto: CreateMaintenanceScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.createSchedule(user.tenantId, user.id, dto);
  }

  @Post('schedules/preview')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  previewSchedule(@Body() dto: PreviewMaintenanceScheduleDto) {
    return this.scheduling.preview(dto);
  }

  @Get('schedules/:id')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW)
  getSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.getSchedule(user.tenantId, id);
  }

  @Put('schedules/:id')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.updateSchedule(user.tenantId, id, dto);
  }

  @Post('schedules/:id/activate')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  activateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.activateSchedule(user.tenantId, id);
  }

  @Post('schedules/:id/pause')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  pauseSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.pauseSchedule(user.tenantId, id);
  }

  @Patch('schedules/:id/archive')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  archiveSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.archiveSchedule(user.tenantId, id);
  }

  @Post('occurrences/:id/skip')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  skipOccurrence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SkipMaintenanceOccurrenceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.skipOccurrence(
      user.tenantId,
      id,
      user.id,
      dto.reason,
    );
  }

  @Get('calendar')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW)
  calendar(
    @Query() query: MaintenanceCalendarQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduling.calendar(user.tenantId, query);
  }

  @Post('events')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  event(@Body() dto: IngestMaintenanceEventDto, @CurrentUser() user: AuthUser) {
    return this.scheduling.ingestEvent(user.tenantId, dto);
  }

  @Get('meters')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW)
  listMeters(
    @Query('equipmentId') equipmentId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meters.list(user.tenantId, equipmentId);
  }

  @Post('meters')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE)
  createMeter(
    @Body() dto: CreateEquipmentMeterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meters.create(user.tenantId, dto);
  }

  @Get('meters/:id/readings')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW)
  meterHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meters.history(user.tenantId, id);
  }

  @Post('meters/:id/readings')
  @RequirePermissions(PERMISSIONS.MAINTENANCE_METER_READ)
  meterReading(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMeterReadingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meters.addReading(user.tenantId, id, user.id, dto);
  }
}
