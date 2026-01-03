import { createAuth } from '@/auth/better-auth.config';
import { storePasswordResetToken } from '@/auth/password-reset-token.store';
import { storeVerificationToken } from '@/auth/verification-token.store';

jest.mock('@/auth/password-reset-token.store', () => ({
  storePasswordResetToken: jest.fn(),
}));

jest.mock('@/auth/verification-token.store', () => ({
  storeVerificationToken: jest.fn(),
}));

describe('createAuth', () => {
  it('configures better-auth and token callbacks', async () => {
    const { betterAuth } = jest.requireMock('better-auth/minimal') as {
      betterAuth: jest.Mock;
    };
    const { drizzleAdapter } = jest.requireMock('better-auth/adapters/drizzle') as {
      drizzleAdapter: jest.Mock;
    };
    const { bearer } = jest.requireMock('better-auth/plugins/bearer') as {
      bearer: jest.Mock;
    };
    const { jwt } = jest.requireMock('better-auth/plugins/jwt') as {
      jwt: jest.Mock;
    };

    const env: any = {
      BETTER_AUTH_BASE_URL: 'http://localhost',
      BETTER_AUTH_BASE_PATH: '/auth',
      BETTER_AUTH_SECRET: 'secret',
      BETTER_AUTH_JWT_ISSUER: 'issuer',
      BETTER_AUTH_JWT_AUDIENCE: 'aud',
      BETTER_AUTH_JWT_ACCESS_TTL: '15m',
    };

    await createAuth({} as any, env, {
      betterAuth,
      drizzleAdapter,
      bearer,
      jwt,
    });

    expect(betterAuth).toHaveBeenCalled();
    const config = betterAuth.mock.calls[0][0];

    await config.emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com' },
      token: 't',
      url: 'http://reset',
    });
    expect(storePasswordResetToken).toHaveBeenCalledWith(
      'user@example.com',
      't',
      'http://reset',
    );

    await config.emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com' },
      token: 'v',
    });
    expect(storeVerificationToken).toHaveBeenCalledWith('user@example.com', 'v');
    expect(config.disabledPaths).toEqual(['/send-verification-email']);

    const definePayload = jwt.mock.calls[0][0].jwt.definePayload;
    const payloadWithRole = definePayload({ user: { role: 'ADMIN' } });
    const payloadWithoutRole = definePayload({ user: {} });
    expect(payloadWithRole).toEqual({ role: 'ADMIN' });
    expect(payloadWithoutRole).toEqual({ role: 'user' });
  });

  it('loads factories when not provided', async () => {
    const { betterAuth } = jest.requireMock('better-auth/minimal') as {
      betterAuth: jest.Mock;
    };

    const env: any = {
      BETTER_AUTH_BASE_URL: '',
      BETTER_AUTH_BASE_PATH: '/auth',
      BETTER_AUTH_SECRET: 'secret',
      BETTER_AUTH_JWT_ISSUER: 'issuer',
      BETTER_AUTH_JWT_AUDIENCE: 'aud',
      BETTER_AUTH_JWT_ACCESS_TTL: '15m',
    };

    await createAuth({} as any, env);

    expect(betterAuth).toHaveBeenCalled();
  });
});
