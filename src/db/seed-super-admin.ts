import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createAuth } from '../auth/better-auth.config';
import { validateEnv } from '../config/env';
import { DEFAULT_SCOPE_ID } from '../rbac/rbac.types';
import * as schema from './schema';
import {
  employeeOrgAssignments,
  orgs,
  people,
  roleAssignments,
  user,
} from './schema';

type RequiredSeedEnv = {
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  SUPER_ADMIN_FIRST_NAME: string;
  SUPER_ADMIN_LAST_NAME: string;
};

export function requireSeedEnv(
  env: ReturnType<typeof validateEnv>,
): RequiredSeedEnv {
  const missing: string[] = [];
  const superAdminEmail = env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD;
  const superAdminFirstName = env.SUPER_ADMIN_FIRST_NAME;
  const superAdminLastName = env.SUPER_ADMIN_LAST_NAME;

  if (!superAdminEmail) missing.push('SUPER_ADMIN_EMAIL');
  if (!superAdminPassword) missing.push('SUPER_ADMIN_PASSWORD');
  if (!superAdminFirstName) missing.push('SUPER_ADMIN_FIRST_NAME');
  if (!superAdminLastName) missing.push('SUPER_ADMIN_LAST_NAME');
  if (missing.length > 0) {
    throw new Error(`Missing required seed env vars: ${missing.join(', ')}`);
  }
  return {
    SUPER_ADMIN_EMAIL: superAdminEmail!,
    SUPER_ADMIN_PASSWORD: superAdminPassword!,
    SUPER_ADMIN_FIRST_NAME: superAdminFirstName!,
    SUPER_ADMIN_LAST_NAME: superAdminLastName!,
  };
}

export async function seedSuperAdmin() {
  const env = validateEnv(process.env);
  const seedEnv = requireSeedEnv(env);
  const sslEnabled = env.DB_SSL;

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONN_TIMEOUT_MS,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });

  try {
    const auth = await createAuth(db, env);
    const ctx = await auth.$context;

    const email = seedEnv.SUPER_ADMIN_EMAIL.trim().toLowerCase();
    const firstName = seedEnv.SUPER_ADMIN_FIRST_NAME.trim();
    const lastName = seedEnv.SUPER_ADMIN_LAST_NAME.trim();
    const name = `${firstName} ${lastName}`.trim() || email;

    const existingPerson = await db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.email, email), eq(people.isDeleted, false)))
      .limit(1);

    const personId =
      existingPerson.length > 0 ? existingPerson[0].id : randomUUID();

    if (existingPerson.length === 0) {
      await db.insert(people).values({
        id: personId,
        firstName,
        lastName,
        email,
      });
    }

    const existingUser = await db
      .select({
        id: user.id,
        personId: user.personId,
        emailVerified: user.emailVerified,
        name: user.name,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    let userId = existingUser[0]?.id;
    if (!userId) {
      const createdUser = await ctx.internalAdapter.createUser({
        email,
        name,
        emailVerified: true,
      });
      if (!createdUser?.id) {
        throw new Error('Failed to create super admin auth user');
      }
      userId = createdUser.id;
    }

    /* istanbul ignore next */
    if (!userId) {
      throw new Error('Failed to resolve super admin user id');
    }

    if (existingUser[0]?.personId !== personId) {
      await db.update(user).set({ personId }).where(eq(user.id, userId));
    }

    if (!existingUser[0]?.emailVerified) {
      await ctx.internalAdapter.updateUser(userId, { emailVerified: true });
    }

    if (existingUser[0]?.name !== name) {
      await ctx.internalAdapter.updateUser(userId, { name });
    }

    const passwordHash = await ctx.password.hash(seedEnv.SUPER_ADMIN_PASSWORD);
    const accounts = await ctx.internalAdapter.findAccountByUserId(userId);
    const credentialAccount = accounts?.find(
      (account) => account.providerId === 'credential',
    );

    if (!credentialAccount) {
      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: 'credential',
        accountId: userId,
        password: passwordHash,
      });
    } else {
      await ctx.internalAdapter.updatePassword(userId, passwordHash);
    }

    const existingRole = await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.role, 'SUPER_ADMIN'),
          eq(roleAssignments.scopeId, DEFAULT_SCOPE_ID),
        ),
      )
      .limit(1);

    if (existingRole.length === 0) {
      await db.insert(roleAssignments).values({
        id: randomUUID(),
        userId,
        role: 'SUPER_ADMIN',
        scopeId: DEFAULT_SCOPE_ID,
      });
    }

    const orgId = 'ORG-0';
    const existingOrg = await db
      .select({ id: orgs.id })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (existingOrg.length === 0) {
      await db.insert(orgs).values({
        id: orgId,
        name: 'Default Org',
        code: orgId,
        isActive: true,
      });
    }

    await db
      .insert(employeeOrgAssignments)
      .values({
        personId,
        orgId,
      })
      .onConflictDoUpdate({
        target: employeeOrgAssignments.personId,
        set: {
          orgId,
          updatedAt: new Date(),
        },
      });

    console.log(`Seeded super admin: ${email}`);
  } finally {
    await pool.end();
  }
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  seedSuperAdmin().catch((error) => {
    console.error('Super admin seed failed:', error);
    process.exitCode = 1;
  });
}
