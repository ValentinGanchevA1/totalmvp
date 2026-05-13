import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // Provide user-friendly error messages
      let message = 'Unauthorized';

      if (info?.name === 'TokenExpiredError') {
        message = 'Token expired. Please refresh your token.';
      } else if (info?.name === 'JsonWebTokenError') {
        message = 'Invalid token.';
      } else if (info?.message) {
        message = info.message;
      }

      throw new UnauthorizedException(message);
    }
    return user;
  }
}
