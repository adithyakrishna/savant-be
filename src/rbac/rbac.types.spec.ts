import { DEFAULT_SCOPE_ID, ROLES } from '@/rbac/rbac.types';

describe('rbac types', () => {
  it('defines roles and default scope', () => {
    expect(DEFAULT_SCOPE_ID).toBe('GLOBAL');
    expect(ROLES).toContain('SUPER_ADMIN');
  });
});
