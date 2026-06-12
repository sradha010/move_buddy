import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Access token has expired. Please refresh your token.',
        );
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid access token. Please log in again.',
        );
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token is not yet valid.');
      }

      throw (
        err ||
        new UnauthorizedException(
          'Authentication required. Please provide a valid access token.',
        )
      );
    }

    return user;
  }
}
