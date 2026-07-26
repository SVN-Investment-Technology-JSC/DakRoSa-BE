import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { PermissionEntity, RoleEntity } from '../database/entities';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  listRoles(actor: AuthUser): Promise<RoleEntity[]> {
    return this.roles
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.tenantId = :tenantId', { tenantId: actor.tenantId })
      .andWhere('role.code <> :admin', { admin: 'admin' })
      .orderBy('role.name', 'ASC')
      .addOrderBy('permission.group', 'ASC')
      .addOrderBy('permission.key', 'ASC')
      .getMany();
  }

  listPermissions(): Promise<PermissionEntity[]> {
    return this.permissions.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  async getRole(id: string, actor: AuthUser): Promise<RoleEntity> {
    const role = await this.roles.findOne({
      where: { id, tenantId: actor.tenantId },
      relations: { permissions: true },
    });
    if (!role || role.code === 'admin')
      throw new NotFoundException('Không tìm thấy vai trò.');
    return role;
  }

  async create(
    dto: CreateRoleDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<RoleEntity> {
    if (dto.code === 'admin')
      throw new BadRequestException('Mã vai trò này được bảo vệ.');
    if (
      await this.roles.exists({
        where: { tenantId: actor.tenantId, code: dto.code },
      })
    ) {
      throw new ConflictException('Mã vai trò đã tồn tại.');
    }
    const role = await this.roles.save(
      this.roles.create({
        tenantId: actor.tenantId,
        code: dto.code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isSystem: false,
        permissions: [],
      }),
    );
    await this.record(actor, context, 'create', role.id, { code: role.code });
    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<RoleEntity> {
    const role = await this.getRole(id, actor);
    if (dto.name !== undefined) role.name = dto.name.trim();
    if (dto.description !== undefined)
      role.description = dto.description.trim() || null;
    await this.roles.save(role);
    await this.record(actor, context, 'update', role.id, {
      fields: Object.keys(dto),
    });
    return this.getRole(id, actor);
  }

  async assignPermissions(
    id: string,
    permissionKeys: string[],
    actor: AuthUser,
    context: ClientContext,
  ): Promise<RoleEntity> {
    const role = await this.getRole(id, actor);
    this.assertViewDependencies(permissionKeys);
    const permissions = permissionKeys.length
      ? await this.permissions.find({ where: { key: In(permissionKeys) } })
      : [];
    if (permissions.length !== new Set(permissionKeys).size) {
      throw new BadRequestException(
        'Danh sách quyền chứa giá trị không hợp lệ.',
      );
    }
    role.permissions = permissions;
    await this.roles.save(role);
    await this.record(actor, context, 'assign_permissions', role.id, {
      permissionKeys,
    });
    return this.getRole(id, actor);
  }

  async remove(
    id: string,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<void> {
    const role = await this.getRole(id, actor);
    if (role.isSystem)
      throw new BadRequestException('Không thể xóa vai trò hệ thống.');
    const result = await this.dataSource.query<Array<{ count: string }>>(
      'SELECT COUNT(*)::text AS count FROM membership_roles WHERE role_id = $1',
      [id],
    );
    if (Number(result[0]?.count ?? 0) > 0) {
      throw new ConflictException('Vai trò đang được gán cho người dùng.');
    }
    await this.roles.remove(role);
    await this.record(actor, context, 'delete', id, { code: role.code });
  }

  private assertViewDependencies(keys: string[]): void {
    const selected = new Set(keys);
    for (const key of selected) {
      const [resource, action] = key.split('.');
      if (action !== 'view' && !selected.has(`${resource}.view`)) {
        throw new BadRequestException(
          `Quyền ${key} yêu cầu quyền ${resource}.view.`,
        );
      }
    }
  }

  private record(
    actor: AuthUser,
    context: ClientContext,
    action: string,
    resourceId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.record({
      tenantId: actor.tenantId,
      userId: actor.id,
      username: actor.username,
      action,
      resource: 'role',
      resourceId,
      ipAddress: context.ipAddress,
      details,
    });
  }
}
