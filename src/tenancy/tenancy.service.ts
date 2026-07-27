import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  DEFAULT_TENANT_MODULES,
  TenantModuleKey,
} from '../common/constants/tenant-modules';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  OrganizationUnitEntity,
  PermissionEntity,
  PositionEntity,
  RoleEntity,
  SiteEntity,
  TenantEntity,
  TenantMembershipEntity,
  UserEntity,
} from '../database/entities';
import {
  CreateOrganizationUnitDto,
  CreatePositionDto,
  UpdateOrganizationUnitDto,
  UpdatePositionDto,
} from './dto/organization.dto';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenancyService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(SiteEntity)
    private readonly sites: Repository<SiteEntity>,
    @InjectRepository(OrganizationUnitEntity)
    private readonly organizationUnits: Repository<OrganizationUnitEntity>,
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly memberships: Repository<TenantMembershipEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async bootstrap(tenantId: string) {
    const tenant = await this.findTenant(tenantId);
    const sites = await this.listSitesForTenant(tenant.id);
    const enabled = new Set(tenant.enabledModules);
    return {
      tenant,
      sites,
      capabilities: {
        eOffice: enabled.has('e-office'),
        digitalSignature: enabled.has('digital-signature'),
        organization: enabled.has('organization'),
        hrm: enabled.has('hrm'),
        attendance: enabled.has('attendance'),
        workspace: enabled.has('workspace'),
        planning: enabled.has('planning'),
        kpi: enabled.has('kpi'),
        projectManagement: enabled.has('project-management'),
        internalAdministration: enabled.has('internal-administration'),
      },
    };
  }

  async getSettings(user: AuthUser) {
    const [tenant, sites, organization] = await Promise.all([
      this.findTenant(user.tenantId),
      this.listSitesForTenant(user.tenantId),
      this.listOrganizationForTenant(user.tenantId),
    ]);
    return { tenant, sites, ...organization };
  }

  async updateSettings(
    dto: UpdateTenantDto,
    user: AuthUser,
    context: ClientContext,
  ) {
    const tenant = await this.findTenant(user.tenantId);
    if (dto.name !== undefined) tenant.name = dto.name.trim();
    if (dto.shortName !== undefined) tenant.shortName = dto.shortName.trim();
    if (dto.locale !== undefined) tenant.locale = dto.locale.trim();
    if (dto.timezone !== undefined) tenant.timezone = dto.timezone.trim();
    if (dto.primaryColor !== undefined) tenant.primaryColor = dto.primaryColor;
    await this.tenants.save(tenant);
    await this.record(user, context, 'update_settings', 'tenant', tenant.id, {
      fields: Object.keys(dto).filter((key) =>
        ['name', 'shortName', 'locale', 'timezone', 'primaryColor'].includes(
          key,
        ),
      ),
    });
    return tenant;
  }

  async listSites(user: AuthUser): Promise<SiteEntity[]> {
    return this.listSitesForTenant(user.tenantId);
  }

  async createSite(
    dto: CreateSiteDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SiteEntity> {
    const site = await this.createSiteForTenant(dto, user.tenantId);
    await this.record(user, context, 'create', 'site', site.id, {
      code: site.code,
    });
    return site;
  }

  async updateSite(
    id: string,
    dto: UpdateSiteDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<SiteEntity> {
    const site = await this.findSite(id, user.tenantId);
    this.assignSite(site, dto);
    await this.sites.save(site);
    await this.record(user, context, 'update', 'site', site.id, {
      fields: Object.keys(dto),
    });
    return site;
  }

  async listOrganization(user: AuthUser) {
    return this.listOrganizationForTenant(user.tenantId);
  }

  async createOrganizationUnit(
    dto: CreateOrganizationUnitDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<OrganizationUnitEntity> {
    const unit = await this.createOrganizationUnitForTenant(dto, user.tenantId);
    await this.record(user, context, 'create', 'organization_unit', unit.id, {
      code: unit.code,
    });
    return unit;
  }

  async updateOrganizationUnit(
    id: string,
    dto: UpdateOrganizationUnitDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<OrganizationUnitEntity> {
    const unit = await this.findOrganizationUnit(id, user.tenantId);
    if (dto.parentId !== undefined)
      await this.assertOrganizationParent(dto.parentId, user.tenantId, unit.id);
    if (dto.code !== undefined) unit.code = dto.code.trim();
    if (dto.name !== undefined) unit.name = dto.name.trim();
    if (dto.type !== undefined) unit.type = dto.type.trim();
    if (dto.parentId !== undefined) unit.parentId = dto.parentId ?? null;
    if (dto.sortOrder !== undefined) unit.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;
    await this.organizationUnits.save(unit);
    await this.record(user, context, 'update', 'organization_unit', unit.id, {
      fields: Object.keys(dto),
    });
    return unit;
  }

  async removeOrganizationUnit(
    id: string,
    user: AuthUser,
    context: ClientContext,
  ): Promise<void> {
    const unit = await this.findOrganizationUnit(id, user.tenantId);
    const [children, positions, memberships] = await Promise.all([
      this.organizationUnits.countBy({ parentId: unit.id }),
      this.positions.countBy({ organizationUnitId: unit.id }),
      this.memberships.countBy({ organizationUnitId: unit.id }),
    ]);
    if (children || positions || memberships) {
      throw new BadRequestException(
        'Không thể xóa đơn vị đang có đơn vị con, chức danh hoặc nhân sự được gán.',
      );
    }
    await this.organizationUnits.remove(unit);
    await this.record(user, context, 'delete', 'organization_unit', id);
  }

  async createPosition(
    dto: CreatePositionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<PositionEntity> {
    const position = await this.createPositionForTenant(dto, user.tenantId);
    await this.record(user, context, 'create', 'position', position.id, {
      code: position.code,
    });
    return position;
  }

  async updatePosition(
    id: string,
    dto: UpdatePositionDto,
    user: AuthUser,
    context: ClientContext,
  ): Promise<PositionEntity> {
    const position = await this.findPosition(id, user.tenantId);
    if (dto.organizationUnitId !== undefined && dto.organizationUnitId) {
      await this.findOrganizationUnit(dto.organizationUnitId, user.tenantId);
    }
    if (dto.code !== undefined) position.code = dto.code.trim();
    if (dto.name !== undefined) position.name = dto.name.trim();
    if (dto.organizationUnitId !== undefined)
      position.organizationUnitId = dto.organizationUnitId ?? null;
    if (dto.isActive !== undefined) position.isActive = dto.isActive;
    await this.positions.save(position);
    await this.record(user, context, 'update', 'position', position.id, {
      fields: Object.keys(dto),
    });
    return position;
  }

  async removePosition(
    id: string,
    user: AuthUser,
    context: ClientContext,
  ): Promise<void> {
    const position = await this.findPosition(id, user.tenantId);
    if (await this.memberships.exists({ where: { positionId: position.id } })) {
      throw new BadRequestException(
        'Không thể xóa chức danh đang được gán cho nhân sự.',
      );
    }
    await this.positions.remove(position);
    await this.record(user, context, 'delete', 'position', id);
  }

  async listPlatformTenants() {
    return this.tenants
      .createQueryBuilder('tenant')
      .loadRelationCountAndMap('tenant.siteCount', 'tenant.sites')
      .loadRelationCountAndMap('tenant.memberCount', 'tenant.memberships')
      .orderBy('tenant.createdAt', 'DESC')
      .getMany();
  }

  async createPlatformTenant(
    dto: CreateTenantDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<TenantEntity> {
    const slug = dto.slug.trim().toLowerCase();
    const code = dto.code.trim().toUpperCase();
    if (await this.tenants.exists({ where: [{ slug }, { code }] })) {
      throw new ConflictException('Mã hoặc slug doanh nghiệp đã tồn tại.');
    }
    const tenant = await this.dataSource.transaction(async (manager) => {
      const created = await manager.getRepository(TenantEntity).save(
        manager.getRepository(TenantEntity).create({
          slug,
          code,
          name: dto.name.trim(),
          shortName: dto.shortName.trim(),
          locale: dto.locale?.trim() || 'vi-VN',
          timezone: dto.timezone?.trim() || 'Asia/Ho_Chi_Minh',
          primaryColor: dto.primaryColor ?? '#386948',
          logoUrl: null,
          enabledModules: this.normalizeModules(dto.enabledModules),
          settings: {},
        }),
      );
      const permissions = await manager.getRepository(PermissionEntity).find();
      const adminRole = await manager.getRepository(RoleEntity).save(
        manager.getRepository(RoleEntity).create({
          tenantId: created.id,
          code: 'admin',
          name: 'Quản trị hệ thống',
          description: 'Vai trò toàn quyền trong phạm vi doanh nghiệp.',
          isSystem: true,
          permissions,
        }),
      );
      await manager.getRepository(RoleEntity).save(
        manager.getRepository(RoleEntity).create({
          tenantId: created.id,
          code: 'user',
          name: 'Người dùng',
          description: 'Vai trò cơ bản dành cho nhân sự doanh nghiệp.',
          isSystem: true,
          permissions: permissions.filter((permission) =>
            [
              'dashboard.view',
              'work-items.view',
              'submissions.view',
              'submissions.create',
              'submissions.update',
              'submissions.submit',
              'signatures.view',
              'organization.view',
            ].includes(permission.key),
          ),
        }),
      );
      await manager.getRepository(TenantMembershipEntity).save(
        manager.getRepository(TenantMembershipEntity).create({
          tenantId: created.id,
          userId: actor.id,
          status: 'active',
          isDefault: false,
          roles: [adminRole],
          organizationUnitId: null,
          positionId: null,
          dataScope: 'tenant',
        }),
      );
      return created;
    });
    await this.record(
      actor,
      context,
      'create',
      'tenant',
      tenant.id,
      {
        code: tenant.code,
        slug: tenant.slug,
      },
      tenant.id,
    );
    return tenant;
  }

  async updatePlatformTenant(
    id: string,
    dto: UpdateTenantDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<TenantEntity> {
    const tenant = await this.findTenant(id);
    if (dto.name !== undefined) tenant.name = dto.name.trim();
    if (dto.shortName !== undefined) tenant.shortName = dto.shortName.trim();
    if (dto.locale !== undefined) tenant.locale = dto.locale.trim();
    if (dto.timezone !== undefined) tenant.timezone = dto.timezone.trim();
    if (dto.primaryColor !== undefined) tenant.primaryColor = dto.primaryColor;
    if (dto.enabledModules !== undefined)
      tenant.enabledModules = this.normalizeModules(dto.enabledModules);
    await this.tenants.save(tenant);
    await this.record(
      actor,
      context,
      'update',
      'tenant',
      tenant.id,
      {
        fields: Object.keys(dto),
      },
      tenant.id,
    );
    return tenant;
  }

  async createPlatformTenantAdmin(
    tenantId: string,
    dto: CreateTenantAdminDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<UserEntity> {
    await this.findTenant(tenantId);
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exists({ where: { username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại.');
    }
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('Email đã tồn tại.');
    }
    const user = await this.dataSource.transaction(async (manager) => {
      const adminRole = await manager.getRepository(RoleEntity).findOneBy({
        tenantId,
        code: 'admin',
      });
      if (!adminRole) {
        throw new NotFoundException(
          'Doanh nghiệp chưa có vai trò quản trị được bảo vệ.',
        );
      }
      const created = await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          username,
          displayName: dto.displayName.trim(),
          shortName: dto.shortName?.trim() || null,
          email,
          phone: dto.phone.trim(),
          address: dto.address?.trim() || null,
          joinedAt: dto.joinedAt,
          workShift: dto.workShift?.trim() || null,
          passwordHash: await argon2.hash(dto.password, {
            type: argon2.argon2id,
          }),
          isActive: true,
          isPlatformAdmin: false,
        }),
      );
      await manager.getRepository(TenantMembershipEntity).save(
        manager.getRepository(TenantMembershipEntity).create({
          tenantId,
          userId: created.id,
          status: 'active',
          isDefault: true,
          roles: [adminRole],
          organizationUnitId: dto.organizationUnitId ?? null,
          positionId: dto.positionId ?? null,
          dataScope: dto.dataScope ?? 'tenant',
        }),
      );
      return created;
    });
    await this.record(
      actor,
      context,
      'create_tenant_admin',
      'user',
      user.id,
      { username, tenantId },
      tenantId,
    );
    return user;
  }

  async platformListSites(tenantId: string): Promise<SiteEntity[]> {
    await this.findTenant(tenantId);
    return this.listSitesForTenant(tenantId);
  }

  async platformCreateSite(
    tenantId: string,
    dto: CreateSiteDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<SiteEntity> {
    const site = await this.createSiteForTenant(dto, tenantId);
    await this.record(
      actor,
      context,
      'create',
      'site',
      site.id,
      { code: site.code },
      tenantId,
    );
    return site;
  }

  async platformUpdateSite(
    tenantId: string,
    id: string,
    dto: UpdateSiteDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<SiteEntity> {
    const site = await this.findSite(id, tenantId);
    this.assignSite(site, dto);
    await this.sites.save(site);
    await this.record(
      actor,
      context,
      'update',
      'site',
      id,
      { fields: Object.keys(dto) },
      tenantId,
    );
    return site;
  }

  private async createSiteForTenant(
    dto: CreateSiteDto,
    tenantId: string,
  ): Promise<SiteEntity> {
    await this.findTenant(tenantId);
    const code = dto.code.trim().toUpperCase();
    if (await this.sites.exists({ where: { tenantId, code } })) {
      throw new ConflictException('Mã nhà máy/địa điểm đã tồn tại.');
    }
    return this.sites.save(
      this.sites.create({
        tenantId,
        code,
        name: dto.name.trim(),
        type: dto.type?.trim() || 'plant',
        isActive: true,
        metadata: {},
      }),
    );
  }

  private assignSite(site: SiteEntity, dto: UpdateSiteDto): void {
    if (dto.code !== undefined) site.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) site.name = dto.name.trim();
    if (dto.type !== undefined) site.type = dto.type.trim();
    if (dto.isActive !== undefined) site.isActive = dto.isActive;
  }

  private async listSitesForTenant(tenantId: string): Promise<SiteEntity[]> {
    return this.sites.find({
      where: { tenantId },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  private async listOrganizationForTenant(tenantId: string) {
    const [units, positions] = await Promise.all([
      this.organizationUnits.find({
        where: { tenantId },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.positions.find({
        where: { tenantId },
        order: { name: 'ASC' },
      }),
    ]);
    return { units, positions };
  }

  private async createOrganizationUnitForTenant(
    dto: CreateOrganizationUnitDto,
    tenantId: string,
  ): Promise<OrganizationUnitEntity> {
    const code = dto.code.trim().toUpperCase();
    if (await this.organizationUnits.exists({ where: { tenantId, code } })) {
      throw new ConflictException('Mã đơn vị đã tồn tại.');
    }
    await this.assertOrganizationParent(dto.parentId, tenantId);
    return this.organizationUnits.save(
      this.organizationUnits.create({
        tenantId,
        parentId: dto.parentId ?? null,
        code,
        name: dto.name.trim(),
        type: dto.type?.trim() || 'department',
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
        metadata: {},
      }),
    );
  }

  private async createPositionForTenant(
    dto: CreatePositionDto,
    tenantId: string,
  ): Promise<PositionEntity> {
    const code = dto.code.trim().toUpperCase();
    if (await this.positions.exists({ where: { tenantId, code } })) {
      throw new ConflictException('Mã chức danh đã tồn tại.');
    }
    if (dto.organizationUnitId) {
      await this.findOrganizationUnit(dto.organizationUnitId, tenantId);
    }
    return this.positions.save(
      this.positions.create({
        tenantId,
        organizationUnitId: dto.organizationUnitId ?? null,
        code,
        name: dto.name.trim(),
        isActive: true,
        metadata: {},
      }),
    );
  }

  private async assertOrganizationParent(
    parentId: string | null | undefined,
    tenantId: string,
    unitId?: string,
  ): Promise<void> {
    if (!parentId) return;
    let parent = await this.findOrganizationUnit(parentId, tenantId);
    if (parent.id === unitId) {
      throw new BadRequestException(
        'Một đơn vị không thể là đơn vị cha của chính nó.',
      );
    }
    while (parent.parentId) {
      if (parent.parentId === unitId) {
        throw new BadRequestException(
          'Không thể tạo vòng lặp trong cây tổ chức.',
        );
      }
      parent = await this.findOrganizationUnit(parent.parentId, tenantId);
    }
  }

  private async findTenant(id: string): Promise<TenantEntity> {
    const tenant = await this.tenants.findOneBy({ id, status: 'active' });
    if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp.');
    return tenant;
  }

  private async findSite(id: string, tenantId: string): Promise<SiteEntity> {
    const site = await this.sites.findOneBy({ id, tenantId });
    if (!site) throw new NotFoundException('Không tìm thấy nhà máy/địa điểm.');
    return site;
  }

  private async findOrganizationUnit(
    id: string,
    tenantId: string,
  ): Promise<OrganizationUnitEntity> {
    const unit = await this.organizationUnits.findOneBy({ id, tenantId });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị tổ chức.');
    return unit;
  }

  private async findPosition(
    id: string,
    tenantId: string,
  ): Promise<PositionEntity> {
    const position = await this.positions.findOneBy({ id, tenantId });
    if (!position) throw new NotFoundException('Không tìm thấy chức danh.');
    return position;
  }

  private normalizeModules(modules?: TenantModuleKey[]): TenantModuleKey[] {
    return [
      ...new Set<TenantModuleKey>([
        'core',
        ...(modules ?? DEFAULT_TENANT_MODULES),
      ]),
    ];
  }

  private record(
    user: AuthUser,
    context: ClientContext,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, unknown>,
    tenantId = user.tenantId,
  ): Promise<void> {
    return this.audit.record({
      tenantId,
      userId: user.id,
      username: user.username,
      action,
      resource,
      resourceId,
      ipAddress: context.ipAddress,
      details,
    });
  }
}
