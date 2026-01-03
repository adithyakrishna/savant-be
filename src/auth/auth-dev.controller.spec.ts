import { AuthDevController } from '@/auth/auth-dev.controller';
import { storeVerificationToken } from '@/auth/verification-token.store';

describe('AuthDevController', () => {
  it('throws when email is missing', () => {
    const controller = new AuthDevController();
    expect(() => controller.getVerificationCode()).toThrow('email is required');
  });

  it('throws when token is missing', () => {
    const controller = new AuthDevController();
    expect(() => controller.getVerificationCode('missing@example.com')).toThrow(
      'verification code not found',
    );
  });

  it('returns normalized email and token', () => {
    const controller = new AuthDevController();
    storeVerificationToken('User@Example.com', 'token-1');

    const result = controller.getVerificationCode('USER@example.com');
    expect(result).toEqual({
      email: 'user@example.com',
      token: 'token-1',
      createdAt: expect.any(String),
    });
  });
});
