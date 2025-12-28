import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createAuth } from '@/auth/better-auth.config';
import { validateEnv } from '@/config/env';
import * as schema from '@/db/schema';

const env = validateEnv(process.env);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export const auth = createAuth(db, env);
export default auth;
