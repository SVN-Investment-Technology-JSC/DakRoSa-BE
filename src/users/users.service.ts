import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AuthSessionEntity,
  OrganizationUnitEntity,
  PositionEntity,
  RoleEntity,
  TenantMembershipEntity,
  TenantEntity,
  UserEntity,
} from '../database/entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

type TenantUserView = UserEntity & {
  membershipId: string;
  roles: RoleEntity[];
  organizationUnit: OrganizationUnitEntity | null;
  position: PositionEntity | null;
  dataScope: TenantMembershipEntity['dataScope'];
  tenantId: string;
  tenantName: string;
  tenantShortName: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly memberships: Repository<TenantMembershipEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessions: Repository<AuthSessionEntity>,
    @InjectRepository(OrganizationUnitEntity)
    private readonly organizationUnits: Repository<OrganizationUnitEntity>,
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: UserQueryDto, actor: AuthUser) {
    const builder = this.memberships
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'user')
      .innerJoinAndSelect('membership.tenant', 'tenant')
      .leftJoinAndSelect('membership.roles', 'role')
      .leftJoinAndSelect('membership.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('membership.position', 'position')
      .where('user.isPlatformAdmin = false')
      .orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (!actor.isPlatformAdmin) {
      builder.andWhere('membership.tenantId = :tenantId', {
        tenantId: actor.tenantId,
      });
    }
    if (query.search?.trim()) {
      builder.andWhere(
        '(user.username ILIKE :search OR user.displayName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    const [memberships, total] = await builder.getManyAndCount();
    return {
      items: memberships.map((membership) => this.toTenantUser(membership)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getById(
    id: string,
    actor: AuthUser,
    requestedTenantId?: string,
  ): Promise<TenantUserView> {
    const membership = await this.findMembership(
      id,
      await this.resolveTenantId(actor, requestedTenantId),
    );
    return this.toTenantUser(membership);
  }

  async create(
    dto: CreateUserDto,
    actor: AuthUser,
    context: ClientContext,
    requestedTenantId?: string,
  ): Promise<TenantUserView> {
    const tenantId = await this.resolveTenantId(actor, requestedTenantId);
    const username = dto.username.trim().toLowerCase();
    if (await this.users.exists({ where: { username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại.');
    }
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);
    const roles = await this.getAssignableRoles(dto.roleIds, tenantId, actor);
    await this.assertOrganizationAssignment(
      dto.organizationUnitId,
      dto.positionId,
      tenantId,
    );
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.dataSource.transaction(async (manager) => {
      const createdUser = await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          username,
          displayName: dto.displayName.trim(),
          shortName: this.normalizeOptional(dto.shortName),
          email,
          phone: dto.phone.trim(),
          address: this.normalizeOptional(dto.address),
          joinedAt: dto.joinedAt,
          workShift: this.normalizeOptional(dto.workShift),
          passwordHash,
          isActive: true,
        }),
      );
      await manager.getRepository(TenantMembershipEntity).save(
        manager.getRepository(TenantMembershipEntity).create({
          tenantId,
          userId: createdUser.id,
          status: 'active',
          isDefault: true,
          organizationUnitId: dto.organizationUnitId,
          positionId: dto.positionId,
          dataScope: dto.dataScope ?? 'tenant',
          roles,
        }),
      );
      return createdUser;
    });

    await this.audit.record({
      tenantId,
      userId: actor.id,
      username: actor.username,
      action: 'create',
      resource: 'user',
      resourceId: user.id,
      ipAddress: context.ipAddress,
      details: {
        username: user.username,
        roleCodes: roles.map((role) => role.code),
      },
    });
    return this.getById(user.id, actor, tenantId);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser,
    context: ClientContext,
    requestedTenantId?: string,
  ): Promise<TenantUserView> {
    const tenantId = await this.resolveTenantId(actor, requestedTenantId);
    const membership = await this.findMembership(id, tenantId);
    this.assertNotAdmin(membership);
    if (dto.roleIds !== undefined && membership.userId === actor.id) {
      throw new BadRequestException(
        'Không thể tự thay đổi vai trò của chính mình.',
      );
    }
    const user = membership.user;
    if (dto.displayName !== undefined)
      user.displayName = dto.displayName.trim();
    if (dto.shortName !== undefined)
      user.shortName = this.normalizeOptional(dto.shortName);
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      await this.assertEmailAvailable(email, user.id);
      user.email = email;
    }
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.address !== undefined)
      user.address = this.normalizeOptional(dto.address);
    if (dto.joinedAt !== undefined) user.joinedAt = dto.joinedAt;
    if (dto.workShift !== undefined)
      user.workShift = this.normalizeOptional(dto.workShift);
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.roleIds !== undefined)
      membership.roles = await this.getAssignableRoles(
        dto.roleIds,
        tenantId,
        actor,
      );
    if (dto.organizationUnitId !== undefined || dto.positionId !== undefined) {
      const organizationUnitId =
        dto.organizationUnitId !== undefined
          ? dto.organizationUnitId
          : membership.organizationUnitId;
      const positionId =
        dto.positionId !== undefined ? dto.positionId : membership.positionId;
      await this.assertOrganizationAssignment(
        organizationUnitId,
        positionId,
        tenantId,
      );
      membership.organizationUnitId = organizationUnitId;
      membership.positionId = positionId;
    }
    if (dto.dataScope !== undefined) membership.dataScope = dto.dataScope;
    await this.users.save(user);
    await this.memberships.save(membership);
    if (dto.isActive === false) {
      await this.sessions.update(
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
    await this.audit.record({
      tenantId,
      userId: actor.id,
      username: actor.username,
      action: 'update',
      resource: 'user',
      resourceId: user.id,
      ipAddress: context.ipAddress,
      details: { fields: Object.keys(dto) },
    });
    return this.getById(user.id, actor, tenantId);
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actor: AuthUser,
    context: ClientContext,
    requestedTenantId?: string,
  ): Promise<void> {
    const tenantId = await this.resolveTenantId(actor, requestedTenantId);
    const membership = await this.findMembership(id, tenantId);
    this.assertNotAdmin(membership);
    await this.users.update(id, {
      passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }),
    });
    await this.sessions.update(
      { userId: id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.audit.record({
      tenantId,
      userId: actor.id,
      username: actor.username,
      action: 'reset_password',
      resource: 'user',
      resourceId: id,
      ipAddress: context.ipAddress,
    });
  }

  async remove(
    id: string,
    actor: AuthUser,
    context: ClientContext,
    requestedTenantId?: string,
  ): Promise<void> {
    const tenantId = await this.resolveTenantId(actor, requestedTenantId);
    const membership = await this.findMembership(id, tenantId);
    this.assertNotAdmin(membership);
    if (membership.userId === actor.id)
      throw new BadRequestException(
        'Không thể xóa tài khoản đang đăng nhập khỏi doanh nghiệp.',
      );

    await this.memberships.remove(membership);
    await this.sessions.update(
      { userId: id, tenantId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    const remainingMemberships = await this.memberships.countBy({ userId: id });
    if (remainingMemberships === 0) {
      await this.users.remove(membership.user);
    }
    await this.audit.record({
      tenantId,
      userId: actor.id,
      username: actor.username,
      action: 'remove_membership',
      resource: 'user',
      resourceId: id,
      ipAddress: context.ipAddress,
      details: { username: membership.user.username },
    });
  }

  async listAssignableRoles(
    actor: AuthUser,
    requestedTenantId?: string,
  ): Promise<RoleEntity[]> {
    const tenantId = await this.resolveTenantId(actor, requestedTenantId);
    const builder = this.roles
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId });
    if (!actor.isPlatformAdmin) {
      builder.andWhere('role.code <> :admin', { admin: 'admin' });
    }
    return builder.orderBy('role.name', 'ASC').getMany();
  }

  private async findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembershipEntity> {
    const membership = await this.memberships.findOne({
      where: { userId, tenantId },
      relations: {
        user: true,
        roles: true,
        tenant: true,
        organizationUnit: true,
        position: true,
      },
    });
    if (!membership) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }
    return membership;
  }

  private async getAssignableRoles(
    ids: string[],
    tenantId: string,
    actor: AuthUser,
  ): Promise<RoleEntity[]> {
    if (!ids.length) return [];
    const builder = this.roles
      .createQueryBuilder('role')
      .where('role.id IN (:...ids)', { ids })
      .andWhere('role.tenantId = :tenantId', { tenantId });
    if (!actor.isPlatformAdmin) {
      builder.andWhere('role.code <> :admin', { admin: 'admin' });
    }
    const roles = await builder.getMany();
    if (roles.length !== new Set(ids).size) {
      throw new BadRequestException(
        'Danh sách vai trò chứa giá trị không hợp lệ.',
      );
    }
    return roles;
  }

  private assertNotAdmin(membership: TenantMembershipEntity): void {
    if (membership.user.isPlatformAdmin) {
      throw new BadRequestException('Tài khoản quản trị hệ thống được bảo vệ.');
    }
  }

  private async resolveTenantId(
    actor: AuthUser,
    requestedTenantId?: string,
  ): Promise<string> {
    if (!requestedTenantId) return actor.tenantId;
    if (!actor.isPlatformAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị hệ thống mới có thể chọn doanh nghiệp khác.',
      );
    }
    const tenant = await this.tenants.findOneBy({ id: requestedTenantId });
    if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp.');
    return tenant.id;
  }

  private async assertOrganizationAssignment(
    organizationUnitId: string | null | undefined,
    positionId: string | null | undefined,
    tenantId: string,
  ): Promise<void> {
    if (organizationUnitId) {
      const unit = await this.organizationUnits.findOneBy({
        id: organizationUnitId,
        tenantId,
      });
      if (!unit) {
        throw new BadRequestException('Phòng ban trực thuộc không hợp lệ.');
      }
    }
    if (positionId) {
      const position = await this.positions.findOneBy({
        id: positionId,
        tenantId,
      });
      if (!position) {
        throw new BadRequestException('Chức danh trực thuộc không hợp lệ.');
      }
    }
  }

  private async assertEmailAvailable(
    email: string,
    excludedUserId?: string,
  ): Promise<void> {
    const builder = this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });
    if (excludedUserId) {
      builder.andWhere('user.id <> :excludedUserId', { excludedUserId });
    }
    if (await builder.getExists()) {
      throw new ConflictException('Email đã tồn tại.');
    }
  }

  private normalizeOptional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toTenantUser(membership: TenantMembershipEntity): TenantUserView {
    return Object.assign(membership.user, {
      membershipId: membership.id,
      roles: membership.roles,
      organizationUnit: membership.organizationUnit ?? null,
      position: membership.position ?? null,
      dataScope: membership.dataScope,
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      tenantShortName: membership.tenant.shortName,
    });
  }
}
