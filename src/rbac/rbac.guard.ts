import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { RbacService } from '@/rbac/rbac.service';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import type { Role } from '@/rbac/rbac.types';
import { RBAC_ROLES_KEY, RBAC_SCOPE_KEY } from '@/rbac/rbac.decorators';

type RequestWithSession = Request & {
  authSession?: Awaited<ReturnType<AuthService['getSession']>>;
};

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithSession>();
    const session = await this.authService.getSession(req);
    if (!session?.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    this.rbacService.requireVerifiedUser(session);
    req.authSession = session;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>(RBAC_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const scopeId =
      this.reflector.getAllAndOverride<string>(RBAC_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || DEFAULT_SCOPE_ID;

    const req = context.switchToHttp().getRequest<RequestWithSession>();
    const session = req.authSession ?? (await this.authService.getSession(req));
    await this.rbacService.requireRole(session, roles, scopeId);
    req.authSession = session ?? undefined;
    return true;
  }
}
