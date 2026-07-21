import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AuthSessionEntity, UserEntity } from '../database/entities';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
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
    const [user, session] = await Promise.all([
      this.usersRepository.findOne({
        where: { id: payload.sub, isActive: true },
        relations: { roles: { permissions: true } },
      }),
      this.sessionsRepository.findOne({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      }),
    ]);
    if (!user || !session)
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      sessionId: session.id,
      tokenId: payload.jti,
      roleCodes: user.roles.map((role) => role.code),
      permissions: [
        ...new Set(
          user.roles.flatMap((role) =>
            role.permissions.map((item) => item.key),
          ),
        ),
      ],
    };
  }
}
