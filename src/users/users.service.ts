import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AuthSessionEntity,
  RoleEntity,
  UserEntity,
} from '../database/entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessions: Repository<AuthSessionEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(query: UserQueryDto) {
    const builder = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.search?.trim()) {
      builder.andWhere(
        '(user.username ILIKE :search OR user.displayName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    const [items, total] = await builder.getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string): Promise<UserEntity> {
    const user = await this.users.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    return user;
  }

  async create(
    dto: CreateUserDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<UserEntity> {
    const username = dto.username.trim().toLowerCase();
    if (await this.users.exists({ where: { username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại.');
    }
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);
    const roles = await this.getAssignableRoles(dto.roleIds);
    const user = await this.users.save(
      this.users.create({
        username,
        displayName: dto.displayName.trim(),
        shortName: this.normalizeOptional(dto.shortName),
        email,
        phone: dto.phone.trim(),
        address: this.normalizeOptional(dto.address),
        joinedAt: dto.joinedAt,
        workShift: this.normalizeOptional(dto.workShift),
        passwordHash: await argon2.hash(dto.password, {
          type: argon2.argon2id,
        }),
        isActive: true,
        roles,
      }),
    );
    await this.audit.record({
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
    return this.getById(user.id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<UserEntity> {
    const user = await this.getById(id);
    this.assertNotAdmin(user);
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
      user.roles = await this.getAssignableRoles(dto.roleIds);
    await this.users.save(user);
    if (dto.isActive === false) {
      await this.sessions.update(
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
    await this.audit.record({
      userId: actor.id,
      username: actor.username,
      action: 'update',
      resource: 'user',
      resourceId: user.id,
      ipAddress: context.ipAddress,
      details: { fields: Object.keys(dto) },
    });
    return this.getById(user.id);
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actor: AuthUser,
    context: ClientContext,
  ): Promise<void> {
    const user = await this.getById(id);
    this.assertNotAdmin(user);
    await this.users.update(id, {
      passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }),
    });
    await this.sessions.update(
      { userId: id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.audit.record({
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
  ): Promise<void> {
    const user = await this.getById(id);
    this.assertNotAdmin(user);
    if (user.id === actor.id)
      throw new BadRequestException('Không thể xóa tài khoản đang đăng nhập.');
    await this.users.remove(user);
    await this.audit.record({
      userId: actor.id,
      username: actor.username,
      action: 'delete',
      resource: 'user',
      resourceId: id,
      ipAddress: context.ipAddress,
      details: { username: user.username },
    });
  }

  listAssignableRoles(): Promise<RoleEntity[]> {
    return this.roles
      .createQueryBuilder('role')
      .where('role.code <> :admin', { admin: 'admin' })
      .orderBy('role.name', 'ASC')
      .getMany();
  }

  private async getAssignableRoles(ids: string[]): Promise<RoleEntity[]> {
    if (!ids.length) return [];
    const roles = await this.roles
      .createQueryBuilder('role')
      .where('role.id IN (:...ids)', { ids })
      .andWhere('role.code <> :admin', { admin: 'admin' })
      .getMany();
    if (roles.length !== new Set(ids).size) {
      throw new BadRequestException(
        'Danh sách vai trò chứa giá trị không hợp lệ.',
      );
    }
    return roles;
  }

  private assertNotAdmin(user: UserEntity): void {
    if (user.roles.some((role) => role.code === 'admin')) {
      throw new BadRequestException('Tài khoản quản trị hệ thống được bảo vệ.');
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
}
