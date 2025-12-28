import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Env } from '../config/env';
import { DatabaseService } from './db.service';
import { DRIZZLE_DB, PG_POOL } from './db.constants';
import * as schema from './schema';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const sslEnabled = configService.get('DB_SSL', { infer: true });
        return new Pool({
          connectionString: configService.get('DATABASE_URL', { infer: true }),
          min: configService.get('DB_POOL_MIN', { infer: true }),
          max: configService.get('DB_POOL_MAX', { infer: true }),
          idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT_MS', {
            infer: true,
          }),
          connectionTimeoutMillis: configService.get('DB_CONN_TIMEOUT_MS', {
            infer: true,
          }),
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
        });
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_POOL, ConfigService],
      useFactory: (pool: Pool, configService: ConfigService<Env, true>) =>
        drizzle(pool, {
          schema,
          logger: configService.get('DB_LOG_QUERIES', { infer: true }),
        }),
    },
    DatabaseService,
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
