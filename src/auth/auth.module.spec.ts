import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuthModule } from '@/auth/auth.module';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { createAuth } from '@/auth/better-auth.config';

jest.mock('@/auth/better-auth.config', () => ({
  createAuth: jest.fn().mockResolvedValue({}),
}));

describe('AuthModule', () => {
  it('creates auth instance with config values', async () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as any[];
    const authProvider = providers.find((provider) => provider.provide === AUTH_INSTANCE);

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          NODE_ENV: 'test',
          PORT: 3000,
          DATABASE_URL: 'postgres://example',
          DB_POOL_MIN: 0,
          DB_POOL_MAX: 10,
          DB_IDLE_TIMEOUT_MS: 30000,
          DB_CONN_TIMEOUT_MS: 2000,
          DB_SSL: false,
          DB_LOG_QUERIES: false,
          BETTER_AUTH_BASE_URL: 'http://localhost',
          BETTER_AUTH_BASE_PATH: '/auth',
          BETTER_AUTH_SECRET: 'secret',
          BETTER_AUTH_JWT_ISSUER: 'issuer',
          BETTER_AUTH_JWT_AUDIENCE: 'aud',
          BETTER_AUTH_JWT_ACCESS_TTL: '15m',
        };
        return values[key];
      }),
    };

    await authProvider.useFactory(configService, {});

    expect(createAuth).toHaveBeenCalled();
  });
});
