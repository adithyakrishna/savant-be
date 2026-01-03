import {
  storePasswordResetToken,
  getPasswordResetToken,
  clearPasswordResetToken,
} from '@/auth/password-reset-token.store';

describe('password-reset-token.store', () => {
  it('stores and clears normalized tokens', () => {
    storePasswordResetToken('  User@Example.com ', 'token', 'http://reset');
    const entry = getPasswordResetToken('user@example.com');
    expect(entry?.token).toBe('token');
    expect(entry?.url).toBe('http://reset');

    clearPasswordResetToken('USER@example.com');
    expect(getPasswordResetToken('user@example.com')).toBeUndefined();
  });
});
