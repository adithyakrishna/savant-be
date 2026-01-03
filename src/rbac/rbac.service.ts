import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { roleAssignments } from '@/db/schema';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import type { Role } from '@/rbac/rbac.types';
import type { AuthSession } from '@/auth/auth.service';

@Injectable()
export class RbacService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getUserScopeRoles(userId: string, scopeId: string = DEFAULT_SCOPE_ID) {
    const rows = await this.db
      .select({ role: roleAssignments.role })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          inArray(roleAssignments.scopeId, [scopeId, DEFAULT_SCOPE_ID]),
        ),
      );
    return new Set<Role>(rows.map((row) => row.role as Role));
  }

  requireVerifiedUser(session: AuthSession): asserts session is Exclude<AuthSession, null> {
    if (!session?.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    if (!session.user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }
  }

  async requireRole(
    session: AuthSession,
    roles: Role[],
    scopeId: string = DEFAULT_SCOPE_ID,
  ) {
    this.requireVerifiedUser(session);
    const userRoles = await this.getUserScopeRoles(session.user.id, scopeId);
    const allowed = roles.some((role) => userRoles.has(role));
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }
    return userRoles;
  }

  canProvisionRole(actorRoles: Set<Role>, targetRole: Role) {
    if (actorRoles.has('SUPER_ADMIN')) {
      return true;
    }
    if (actorRoles.has('ADMIN')) {
      return targetRole !== 'SUPER_ADMIN';
    }
    return false;
  }
}
