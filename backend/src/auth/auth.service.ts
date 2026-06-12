import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { VerifyFirebaseDto } from './dto/verify-firebase.dto';
import { User } from '@prisma/client';

const BCRYPT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // ─── Firebase Phone Auth ──────────────────────────────────────────────────────

  async verifyFirebaseToken(
    dto: VerifyFirebaseDto,
    res: Response,
  ): Promise<{ access_token: string; is_new_user: boolean; user: Partial<User> }> {
    const decoded = await this.firebaseService.verifyIdToken(dto.idToken);

    const phone = decoded.phone_number;
    if (!phone) {
      throw new UnauthorizedException(
        'Firebase token does not contain a phone number. Ensure Phone Auth is enabled.',
      );
    }

    // Find or create user
    let existingUser = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !existingUser;

    let user = existingUser
      ? await this.prisma.user.update({
          where: { phone },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(dto.email && { email: dto.email }),
            is_verified: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            name: dto.name ?? 'BuddyRide User',
            phone,
            ...(dto.email && { email: dto.email }),
            is_verified: true,
            role: 'guest',
            active_mode: 'guest',
          },
        });

    if (isNewUser) this.logger.log(`New user registered: ${user.id} (${phone})`);

    if (user.is_suspended) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    const { access_token, refresh_token } = await this.generateTokens(user);
    this.setRefreshTokenCookie(res, refresh_token);

    const { id, name, email, role, active_mode, is_verified, profile_photo, created_at } = user;
    return {
      access_token,
      is_new_user: isNewUser,
      user: { id, name, email, phone, role, active_mode, is_verified, profile_photo, created_at },
    };
  }

  // ─── Admin Login (phone + password stored in DB) ─────────────────────────────
  //
  // First-time setup: if the admin user doesn't exist yet, ADMIN_SECRET from
  // .env acts as the initial password and the hash is saved to the database.
  // All subsequent logins use the stored bcrypt hash — the env var is no longer
  // needed after the first successful login.

  async adminLogin(
    phone: string,
    password: string,
    res: Response,
  ): Promise<{ access_token: string; user: Partial<User> }> {
    const adminSecret = this.configService.get<string>('ADMIN_SECRET');

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Bootstrap: no admin account yet — accept ADMIN_SECRET as the first password
      if (!adminSecret || password !== adminSecret) {
        throw new UnauthorizedException('Invalid credentials.');
      }
      const password_hash = await bcryptjs.hash(password, BCRYPT_ROUNDS);
      user = await this.prisma.user.create({
        data: { name: 'Admin', phone, role: 'admin', is_verified: true, password_hash },
      });
      this.logger.log(`Admin account created for ${phone}`);
    } else {
      // Existing user — verify against stored hash, or against ADMIN_SECRET if no hash yet
      const isValid = user.password_hash
        ? await bcryptjs.compare(password, user.password_hash)
        : (adminSecret && password === adminSecret);

      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      // Promote to admin if needed
      if (user.role !== 'admin' || !user.is_verified) {
        user = await this.prisma.user.update({
          where: { phone },
          data: { role: 'admin', is_verified: true },
        });
      }

      // Persist hash if this is the first login for an existing user
      if (!user.password_hash) {
        const password_hash = await bcryptjs.hash(password, BCRYPT_ROUNDS);
        await this.prisma.user.update({ where: { phone }, data: { password_hash } });
      }
    }

    if (user.is_suspended) {
      throw new UnauthorizedException('This account is suspended.');
    }

    const { access_token, refresh_token } = await this.generateTokens(user);
    this.setRefreshTokenCookie(res, refresh_token);

    const { id, name, email, role, active_mode, profile_photo } = user;
    return { access_token, user: { id, name, email, phone, role, active_mode, profile_photo } };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async refreshToken(
    userId: string,
    tokenId: string,
    res: Response,
  ): Promise<{ access_token: string }> {
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });

    if (!existingToken || existingToken.is_revoked || existingToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    if (existingToken.user_id !== userId) {
      throw new UnauthorizedException('Token ownership mismatch. Please log in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.is_suspended) {
      throw new UnauthorizedException(
        user?.is_suspended
          ? 'Your account has been suspended.'
          : 'User not found.',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { is_revoked: true },
    });

    const { access_token, refresh_token } = await this.generateTokens(user);
    this.setRefreshTokenCookie(res, refresh_token);

    return { access_token };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(
    userId: string,
    rawRefreshToken: string | null,
    res: Response,
  ): Promise<{ message: string }> {
    if (rawRefreshToken) {
      try {
        const payload = this.jwtService.verify(rawRefreshToken, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        }) as { tokenId: string };

        if (payload?.tokenId) {
          await this.prisma.refreshToken.updateMany({
            where: { id: payload.tokenId, user_id: userId, is_revoked: false },
            data: { is_revoked: true },
          });
        }
      } catch {
        // Token invalid/expired — proceed to clear cookie anyway
      }
    }

    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully.' };
  }

  // ─── Token Generation ─────────────────────────────────────────────────────────

  async generateTokens(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_COOKIE_MAX_AGE_MS);

    const tokenRecord = await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: randomBytes(32).toString('hex'),
        expires_at: expiresAt,
      },
    });

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, phone: user.phone, role: user.role },
        { secret: jwtSecret, expiresIn: ACCESS_TOKEN_EXPIRY },
      ),
      this.jwtService.signAsync(
        { sub: user.id, tokenId: tokenRecord.id },
        { secret: jwtRefreshSecret, expiresIn: REFRESH_TOKEN_EXPIRY },
      ),
    ]);

    const tokenHash = await bcryptjs.hash(refresh_token, BCRYPT_ROUNDS);
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { token_hash: tokenHash },
    });

    return { access_token, refresh_token };
  }

  // ─── Cookie Helpers ───────────────────────────────────────────────────────────

  setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }

  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
