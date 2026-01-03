import { provisionUserSchema } from '@/admin/admin.types';

describe('provisionUserSchema', () => {
  it('parses student payload with defaults', () => {
    const result = provisionUserSchema.parse({
      role: 'STUDENT',
      personId: 'p1',
      passwordResetRedirectTo: 'https://example.com/reset',
    });

    expect(result.scopeId).toBe('GLOBAL');
    expect(result.role).toBe('STUDENT');
  });

  it('parses staff payload', () => {
    const result = provisionUserSchema.parse({
      role: 'ADMIN',
      personId: 'p1',
      email: 'user@example.com',
    });

    expect(result.role).toBe('ADMIN');
  });
});
