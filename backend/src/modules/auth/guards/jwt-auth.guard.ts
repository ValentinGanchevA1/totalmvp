import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('Authorization header:', request.headers.authorization); // временно
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      console.error('JWT error info:', info); // ще покаже защо е неуспешен (expired, invalid token и т.н.)
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }
}
