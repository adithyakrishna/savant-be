import { applyDecorators, SetMetadata } from '@nestjs/common';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import type { Role } from '@/rbac/rbac.types';

export const RBAC_ROLES_KEY = 'rbac:roles';
export const RBAC_SCOPE_KEY = 'rbac:scope';

export const RequireRoles = (roles: Role[] | Role, scopeId: string = DEFAULT_SCOPE_ID) =>
  applyDecorators(
    SetMetadata(RBAC_ROLES_KEY, Array.isArray(roles) ? roles : [roles]),
    SetMetadata(RBAC_SCOPE_KEY, scopeId),
  );
