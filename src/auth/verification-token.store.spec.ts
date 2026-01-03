import {
  storeVerificationToken,
  getVerificationToken,
  clearVerificationToken,
} from '@/auth/verification-token.store';

describe('verification-token.store', () => {
  it('stores and clears normalized tokens', () => {
    storeVerificationToken('  USER@Example.com ', 'token-1');
    const entry = getVerificationToken('user@example.com');
    expect(entry?.token).toBe('token-1');

    clearVerificationToken('USER@example.com');
    expect(getVerificationToken('user@example.com')).toBeUndefined();
  });
});
