import type { Env } from '@/config/env';
import type { DrizzleDb } from '@/db/db.types';
import * as schema from '@/db/schema';
import { storeVerificationToken } from '@/auth/verification-token.store';
import { storePasswordResetToken } from '@/auth/password-reset-token.store';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins/bearer';
import { jwt } from 'better-auth/plugins/jwt';

type AuthFactories = {
  betterAuth: typeof betterAuth;
  drizzleAdapter: typeof drizzleAdapter;
  bearer: typeof bearer;
  jwt: typeof jwt;
};

const defaultFactories: AuthFactories = {
  betterAuth,
  drizzleAdapter,
  bearer,
  jwt,
};

export async function createAuth(
  db: DrizzleDb,
  env: Env,
  factories: AuthFactories = defaultFactories,
) {
  const { betterAuth, drizzleAdapter, bearer, jwt } = factories;

  return betterAuth({
    baseURL: env.BETTER_AUTH_BASE_URL || undefined,
    basePath: env.BETTER_AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      disableSignUp: true,
      sendResetPassword: async ({ user, token, url }) => {
        storePasswordResetToken(user.email, token, url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, token }) => {
        storeVerificationToken(user.email, token);
      },
    },
    plugins: [
      jwt({
        jwt: {
          issuer: env.BETTER_AUTH_JWT_ISSUER,
          audience: env.BETTER_AUTH_JWT_AUDIENCE,
          expirationTime: env.BETTER_AUTH_JWT_ACCESS_TTL,
          definePayload: ({ user }) => ({
            role: (user as { role?: string }).role ?? 'user',
          }),
        },
      }),
      bearer(),
    ],
    disabledPaths: ['/send-verification-email'],
  });
}
