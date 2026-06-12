import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  phone: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['refresh_token'] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const rawToken: string | undefined = req?.cookies?.['refresh_token'];

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found in cookies.');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active_mode: true,
            is_verified: true,
            is_suspended: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found. Please log in again.');
    }

    if (storedToken.is_revoked) {
      throw new UnauthorizedException('Refresh token has been revoked. Please log in again.');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    const isTokenValid = await bcryptjs.compare(rawToken, storedToken.token_hash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token. Please log in again.');
    }

    if (storedToken.user.is_suspended) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    return {
      ...storedToken.user,
      tokenId: storedToken.id,
    };
  }
}
