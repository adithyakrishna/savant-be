import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import type { AuthSession } from '@/auth/auth.service';
import { HRMS_ALLOW_SELF_KEY } from '@/hrms/hrms.decorators';
import { HRMS_SCOPE_ID } from '@/hrms/hrms.constants';
import { RbacService } from '@/rbac/rbac.service';
import type { Role } from '@/rbac/rbac.types';
import type { Env } from '@/config/env';

const DEFAULT_ALLOWED_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN'];

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithTarget = RequestWithSession & {
  params?: { personId?: string };
  query?: { personId?: string };
  body?: { personId?: string };
};

@Injectable()
export class HrmsAccessGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly rbacService: RbacService,
    private readonly configService: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {}

  private parseAllowedRoles(): Role[] {
    const raw = this.configService.get('HRMS_ALLOWED_ROLES', { infer: true });
    if (!raw) {
      return DEFAULT_ALLOWED_ROLES;
    }

    const roles = raw
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    return (roles.length > 0 ? roles : DEFAULT_ALLOWED_ROLES) as Role[];
  }

  private resolveTargetPersonId(req: RequestWithTarget): string | undefined {
    return req.params?.personId ?? req.query?.personId ?? req.body?.personId;
  }

  private async requireHrmsAccess(
    session: AuthSession,
    allowSelf: boolean,
    req: RequestWithTarget,
  ) {
    this.rbacService.requireVerifiedUser(session);
    const allowedRoles = this.parseAllowedRoles();
    const actorRoles = await this.rbacService.getUserScopeRoles(
      session.user.id,
    );
    const baseAllowed = allowedRoles.some((role) => actorRoles.has(role));
    if (baseAllowed) {
      return;
    }

    if (allowSelf && session?.user?.personId) {
      const targetPersonId = this.resolveTargetPersonId(req);
      if (!targetPersonId || targetPersonId === session.user.personId) {
        return;
      }
    }

    const hrmsRoles = await this.rbacService.getUserScopeRoles(
      session.user.id,
      HRMS_SCOPE_ID,
    );
    const overrideAllowed = allowedRoles.some((role) => hrmsRoles.has(role));
    if (!overrideAllowed) {
      throw new ForbiddenException('HRMS access required');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithTarget>();
    const allowSelf = this.reflector.getAllAndOverride<boolean>(
      HRMS_ALLOW_SELF_KEY,
      [context.getHandler(), context.getClass()],
    );
    const session = req.authSession ?? (await this.authService.getSession(req));
    await this.requireHrmsAccess(session ?? null, Boolean(allowSelf), req);
    req.authSession = session ?? undefined;
    return true;
  }
}
