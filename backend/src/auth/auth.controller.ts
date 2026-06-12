import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { VerifyFirebaseDto } from './dto/verify-firebase.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Firebase Phone Auth ──────────────────────────────────────────────────────

  @Public()
  @Post('verify-firebase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login / Register via Firebase Phone Auth',
    description:
      'Pass the Firebase ID Token obtained after phone OTP verification. ' +
      'Creates a new account on first login. Returns a JWT access token and sets an HttpOnly refresh token cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated successfully.',
    schema: {
      example: {
        access_token: 'eyJhbGci...',
        user: { id: 'uuid', name: 'Rahul', phone: '+919876543210', role: 'guest' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired Firebase ID token.' })
  async verifyFirebase(
    @Body() dto: VerifyFirebaseDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyFirebaseToken(dto, res);
  }

  // ─── Admin Login (dev / no-OTP) ───────────────────────────────────────────────

  @Public()
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login using phone + ADMIN_SECRET (no OTP required)',
    description: 'Bypasses phone OTP. Use ADMIN_SECRET from .env. Promotes the user to admin role automatically.',
  })
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.adminLogin(dto.phone, dto.password, res);
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, schema: { example: { access_token: 'eyJhbGci...' } } })
  @ApiResponse({ status: 401, description: 'Refresh token missing, invalid, or expired.' })
  async refreshToken(
    @Req() req: Request & { user: { id: string; tokenId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshToken(req.user.id, req.user.tokenId, res);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Logged out successfully.' } } })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken: string | undefined = req.cookies?.['refresh_token'];
    return this.authService.logout(userId, rawRefreshToken ?? null, res);
  }
}
