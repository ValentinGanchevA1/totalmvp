import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RedisService } from '../../../common/redis.service';

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}

// 5 minutes — short enough to pick up bans/deactivations without hammering Postgres
const AUTH_CACHE_TTL_SECONDS = 300;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private redis: RedisService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<Pick<User, 'id' | 'email' | 'phone' | 'isActive' | 'isBanned'>> {
    const cacheKey = `auth:user:${payload.sub}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const user = JSON.parse(cached) as Pick<User, 'id' | 'email' | 'phone' | 'isActive' | 'isBanned'>;
      if (!user.isActive || user.isBanned) {
        throw new UnauthorizedException('Invalid token or user inactive');
      }
      return user;
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, phone: true, isActive: true, isBanned: true },
    });

    if (!user || !user.isActive || user.isBanned) {
      throw new UnauthorizedException('Invalid token or user inactive');
    }

    await this.redis.set(cacheKey, JSON.stringify(user), AUTH_CACHE_TTL_SECONDS);

    return user;
  }
}
