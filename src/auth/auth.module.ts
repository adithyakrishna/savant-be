import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@/auth/auth.controller';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { createAuth } from '@/auth/better-auth.config';
import { AuthService } from '@/auth/auth.service';
import { Env } from '@/config/env';
import { DatabaseModule } from '@/db/db.module';
import { DRIZZLE_DB } from '@/db/db.constants';
import { DrizzleDb } from '@/db/db.types';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_INSTANCE,
      inject: [ConfigService, DRIZZLE_DB],
      useFactory: async (
        configService: ConfigService<Env, true>,
        db: DrizzleDb,
      ) =>
        createAuth(db, {
          NODE_ENV: configService.get('NODE_ENV', { infer: true }),
          PORT: configService.get('PORT', { infer: true }),
          DATABASE_URL: configService.get('DATABASE_URL', { infer: true }),
          DB_POOL_MIN: configService.get('DB_POOL_MIN', { infer: true }),
          DB_POOL_MAX: configService.get('DB_POOL_MAX', { infer: true }),
          DB_IDLE_TIMEOUT_MS: configService.get('DB_IDLE_TIMEOUT_MS', {
            infer: true,
          }),
          DB_CONN_TIMEOUT_MS: configService.get('DB_CONN_TIMEOUT_MS', {
            infer: true,
          }),
          DB_SSL: configService.get('DB_SSL', { infer: true }),
          DB_LOG_QUERIES: configService.get('DB_LOG_QUERIES', { infer: true }),
          BETTER_AUTH_BASE_URL: configService.get('BETTER_AUTH_BASE_URL', {
            infer: true,
          }),
          BETTER_AUTH_BASE_PATH: configService.get('BETTER_AUTH_BASE_PATH', {
            infer: true,
          }),
          BETTER_AUTH_SECRET: configService.get('BETTER_AUTH_SECRET', {
            infer: true,
          }),
          BETTER_AUTH_JWT_ISSUER: configService.get('BETTER_AUTH_JWT_ISSUER', {
            infer: true,
          }),
          BETTER_AUTH_JWT_AUDIENCE: configService.get(
            'BETTER_AUTH_JWT_AUDIENCE',
            {
              infer: true,
            },
          ),
          BETTER_AUTH_JWT_ACCESS_TTL: configService.get(
            'BETTER_AUTH_JWT_ACCESS_TTL',
            {
              infer: true,
            },
          ),
        }),
    },
    AuthService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
