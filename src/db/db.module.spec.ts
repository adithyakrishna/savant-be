import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { DatabaseModule } from '@/db/db.module';
import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn(),
}));

describe('DatabaseModule', () => {
  it('creates the PG pool with SSL disabled', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DatabaseModule) as any[];
    const provider = providers.find((item) => item.provide === PG_POOL);

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          DATABASE_URL: 'postgres://example',
          DB_POOL_MIN: 0,
          DB_POOL_MAX: 5,
          DB_IDLE_TIMEOUT_MS: 30000,
          DB_CONN_TIMEOUT_MS: 2000,
          DB_SSL: false,
        };
        return values[key];
      }),
    };

    provider.useFactory(configService);
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: undefined }),
    );
  });

  it('creates drizzle db with logger', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DatabaseModule) as any[];
    const provider = providers.find((item) => item.provide === DRIZZLE_DB);

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          DB_LOG_QUERIES: true,
        };
        return values[key];
      }),
    };

    const pool = {} as any;
    provider.useFactory(pool, configService);

    expect(drizzle).toHaveBeenCalledWith(pool, expect.objectContaining({ logger: true }));
  });

  it('enables SSL when configured', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DatabaseModule) as any[];
    const provider = providers.find((item) => item.provide === PG_POOL);

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          DATABASE_URL: 'postgres://example',
          DB_POOL_MIN: 0,
          DB_POOL_MAX: 5,
          DB_IDLE_TIMEOUT_MS: 30000,
          DB_CONN_TIMEOUT_MS: 2000,
          DB_SSL: true,
        };
        return values[key];
      }),
    };

    provider.useFactory(configService);
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );
  });
});
