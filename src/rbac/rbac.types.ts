export const DEFAULT_SCOPE_ID = 'GLOBAL' as const;

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'STAFF',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'PENDING',
] as const;

export type Role = (typeof ROLES)[number];
