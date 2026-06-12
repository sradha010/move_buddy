import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Refresh token has expired. Please log in again.',
        );
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid refresh token. Please log in again.',
        );
      }

      throw (
        err ||
        new UnauthorizedException(
          'Refresh token is required. Please log in again.',
        )
      );
    }

    return user;
  }
}
