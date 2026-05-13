import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<T>(err: Error | null, user: T, info: { message?: string } | null): T {
    if (err || !user) {
      this.logger.debug(`JWT auth failed: ${info?.message ?? err?.message ?? 'unknown reason'}`);
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }
}
