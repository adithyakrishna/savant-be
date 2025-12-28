import type { Env } from '@/config/env';
import type { DrizzleDb } from '@/db/db.types';
import * as schema from '@/db/schema';

export async function createAuth(db: DrizzleDb, env: Env) {
  const [{ betterAuth }, { drizzleAdapter }, { bearer }, { jwt }] =
    await Promise.all([
      import('better-auth/minimal'),
      import('better-auth/adapters/drizzle'),
      import('better-auth/plugins/bearer'),
      import('better-auth/plugins/jwt'),
    ]);

  return betterAuth({
    baseURL: env.BETTER_AUTH_BASE_URL || undefined,
    basePath: env.BETTER_AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
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
  });
}
