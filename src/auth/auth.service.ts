import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientContext } from '../common/decorators/client-context.decorator';
import {
  AuthProfile,
  AuthTenant,
  AuthUser,
} from '../common/interfaces/auth-user.interface';
import {
  AuthSessionEntity,
  TenantMembershipEntity,
  UserEntity,
} from '../database/entities';
import { REDIS } from '../redis/redis.module';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthResult {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthProfile;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionsRepository: Repository<AuthSessionEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async login(
    usernameInput: string,
    password: string,
    context: ClientContext,
  ): Promise<AuthResult> {
    const username = usernameInput.trim().toLowerCase();
    const user = await this.findUserWithPassword(username);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      await this.audit.record({
        username,
        action: 'login',
        resource: 'auth',
        status: 'failure',
        ipAddress: context.ipAddress,
        details: { reason: 'invalid_credentials' },
      });
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }
    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị khóa.');
    }

    const memberships = await this.findActiveMemberships(user.id);
    const membership =
      memberships.find((item) => item.isDefault) ?? memberships[0];
    if (!membership) {
      throw new ForbiddenException(
        'Tài khoản chưa được cấp quyền truy cập doanh nghiệp.',
      );
    }

    const result = await this.createSessionAndTokens(
      user,
      membership,
      memberships,
      context,
    );
    user.lastLoginAt = new Date();
    await this.usersRepository.update(user.id, {
      lastLoginAt: user.lastLoginAt,
    });
    await this.audit.record({
      tenantId: membership.tenantId,
      userId: user.id,
      username: user.username,
      action: 'login',
      resource: 'auth',
      resourceId: result.user.id,
      ipAddress: context.ipAddress,
    });
    return result;
  }

  async refresh(
    refreshToken: string | undefined,
    context: ClientContext,
  ): Promise<AuthResult> {
    if (!refreshToken)
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.sessionsRepository.findOne({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: {
        user: true,
        membership: { tenant: true, roles: { permissions: true } },
      },
    });
    if (
      !session ||
      !session.user.isActive ||
      session.membership.status !== 'active' ||
      session.membership.tenant.status !== 'active'
    ) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn hoặc bị thu hồi.',
      );
    }

    const nextToken = randomBytes(64).toString('base64url');
    session.refreshTokenHash = this.hashRefreshToken(nextToken);
    session.userAgent = context.userAgent;
    session.ipAddress = context.ipAddress;
    await this.sessionsRepository.save(session);

    const memberships = await this.findActiveMemberships(session.user.id);
    const access = await this.issueAccessToken(
      session.user,
      session.membership,
      session.id,
    );
    return {
      ...access,
      refreshToken: nextToken,
      refreshExpiresAt: session.expiresAt,
      user: this.toPublicUser(session.user, session.membership, memberships),
    };
  }

  async switchTenant(
    user: AuthUser,
    tenantSlug: string,
  ): Promise<Omit<AuthResult, 'refreshToken' | 'refreshExpiresAt'>> {
    const membership = await this.membershipsRepository.findOne({
      where: {
        userId: user.id,
        status: 'active',
        tenant: { slug: tenantSlug, status: 'active' },
      },
      relations: { tenant: true, roles: { permissions: true } },
    });
    if (!membership) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập doanh nghiệp này.',
      );
    }

    await this.sessionsRepository.update(
      { id: user.sessionId, userId: user.id, revokedAt: IsNull() },
      { tenantId: membership.tenantId, membershipId: membership.id },
    );
    const entity = await this.usersRepository.findOneByOrFail({ id: user.id });
    const memberships = await this.findActiveMemberships(user.id);
    const access = await this.issueAccessToken(
      entity,
      membership,
      user.sessionId,
    );
    await this.audit.record({
      tenantId: membership.tenantId,
      userId: user.id,
      username: user.username,
      action: 'switch_tenant',
      resource: 'auth',
      resourceId: membership.tenantId,
    });
    return {
      ...access,
      user: this.toPublicUser(entity, membership, memberships),
    };
  }

  async logout(refreshToken?: string, accessToken?: string): Promise<void> {
    if (refreshToken) {
      await this.sessionsRepository.update(
        {
          refreshTokenHash: this.hashRefreshToken(refreshToken),
          revokedAt: IsNull(),
        },
        { revokedAt: new Date() },
      );
    }
    if (accessToken) await this.blacklistAccessToken(accessToken);
  }

  async logoutAll(user: AuthUser): Promise<void> {
    await this.sessionsRepository.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username,
      action: 'logout_all',
      resource: 'auth',
    });
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const entity = await this.findUserWithPassword(user.username);
    if (
      !entity ||
      !(await argon2.verify(entity.passwordHash, currentPassword))
    ) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
    }
    entity.passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    await this.usersRepository.save(entity);
    await this.sessionsRepository.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username,
      action: 'change_password',
      resource: 'auth',
    });
  }

  private async createSessionAndTokens(
    user: UserEntity,
    membership: TenantMembershipEntity,
    memberships: TenantMembershipEntity[],
    context: ClientContext,
  ): Promise<AuthResult> {
    const refreshToken = randomBytes(64).toString('base64url');
    const days = this.config.getOrThrow<number>('auth.refreshTokenDays');
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        userId: user.id,
        tenantId: membership.tenantId,
        membershipId: membership.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt,
        revokedAt: null,
      }),
    );
    const access = await this.issueAccessToken(user, membership, session.id);
    return {
      ...access,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: this.toPublicUser(user, membership, memberships),
    };
  }

  private async issueAccessToken(
    user: UserEntity,
    membership: TenantMembershipEntity,
    sessionId: string,
  ) {
    const expiresIn = this.config.getOrThrow<string>('auth.jwtTtl');
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      sid: sessionId,
      tid: membership.tenantId,
      mid: membership.id,
      jti: randomUUID(),
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: expiresIn as never,
    });
    return { accessToken, expiresIn };
  }

  private async blacklistAccessToken(token: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        ignoreExpiration: true,
      });
      const ttl = Math.max(
        1,
        (payload.exp ?? 0) - Math.floor(Date.now() / 1000),
      );
      if (payload.jti && ttl > 0)
        await this.redis.set(`auth:blacklist:${payload.jti}`, '1', 'EX', ttl);
    } catch {
      // Invalid access tokens are ignored during logout; the refresh session is still revoked.
    }
  }

  private findUserWithPassword(username: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username })
      .getOne();
  }

  private findActiveMemberships(
    userId: string,
  ): Promise<TenantMembershipEntity[]> {
    return this.membershipsRepository.find({
      where: {
        userId,
        status: 'active',
        tenant: { status: 'active' },
      },
      relations: { tenant: true, roles: { permissions: true } },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(
    user: UserEntity,
    activeMembership: TenantMembershipEntity,
    memberships: TenantMembershipEntity[],
  ): AuthProfile {
    const tenants = memberships.map((membership) =>
      this.toTenantSummary(membership),
    );
    const activeTenant =
      tenants.find((tenant) => tenant.id === activeMembership.tenantId) ??
      this.toTenantSummary(activeMembership);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isPlatformAdmin: user.isPlatformAdmin,
      activeTenant,
      tenants,
      roleCodes: activeTenant.roleCodes,
      permissions: activeTenant.permissions,
    };
  }

  private toTenantSummary(membership: TenantMembershipEntity): AuthTenant {
    return {
      id: membership.tenant.id,
      slug: membership.tenant.slug,
      code: membership.tenant.code,
      name: membership.tenant.name,
      shortName: membership.tenant.shortName,
      logoUrl: membership.tenant.logoUrl,
      primaryColor: membership.tenant.primaryColor,
      locale: membership.tenant.locale,
      timezone: membership.tenant.timezone,
      enabledModules: membership.tenant.enabledModules,
      roleCodes: membership.roles.map((role) => role.code),
      permissions: [
        ...new Set(
          membership.roles.flatMap((role) =>
            role.permissions.map((permission) => permission.key),
          ),
        ),
      ],
    };
  }
}
