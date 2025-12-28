import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MIN: z.coerce.number().int().nonnegative().default(0),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  DB_SSL: booleanString,
  DB_LOG_QUERIES: booleanString,
  BETTER_AUTH_BASE_URL: z.string().url().optional().or(z.literal('')),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_ISSUER: z.string().min(1).optional(),
  BETTER_AUTH_AUDIENCE: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
