import { AUTH_INSTANCE } from '@/auth/auth.constants';

describe('auth constants', () => {
  it('exposes auth instance token', () => {
    expect(AUTH_INSTANCE).toBe('AUTH_INSTANCE');
  });
});
