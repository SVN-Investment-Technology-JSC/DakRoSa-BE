import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AuthSessionEntity,
  TenantMembershipEntity,
} from '../database/entities';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionsRepository: Repository<AuthSessionEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const [membership, session] = await Promise.all([
      this.membershipsRepository.findOne({
        where: {
          id: payload.mid,
          tenantId: payload.tid,
          userId: payload.sub,
          status: 'active',
          user: { isActive: true },
          tenant: { status: 'active' },
        },
        relations: {
          user: true,
          tenant: true,
          roles: { permissions: true },
        },
      }),
      this.sessionsRepository.findOne({
        where: {
          id: payload.sid,
          userId: payload.sub,
          tenantId: payload.tid,
          membershipId: payload.mid,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      }),
    ]);
    if (!membership || !session)
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');

    return {
      id: membership.user.id,
      username: membership.user.username,
      displayName: membership.user.displayName,
      sessionId: session.id,
      tokenId: payload.jti,
      tenantId: membership.tenantId,
      tenantSlug: membership.tenant.slug,
      enabledModules: membership.tenant.enabledModules,
      membershipId: membership.id,
      organizationUnitId: membership.organizationUnitId,
      positionId: membership.positionId,
      dataScope: membership.dataScope,
      isPlatformAdmin: membership.user.isPlatformAdmin,
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
