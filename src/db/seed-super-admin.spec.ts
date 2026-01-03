import { seedSuperAdmin, requireSeedEnv } from '@/db/seed-super-admin';
import { createAuth } from '@/auth/better-auth.config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

jest.mock('@/auth/better-auth.config', () => ({
  createAuth: jest.fn(),
}));

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn(),
}));

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

function makeSelectChain(result: unknown[]) {
  const chain: any = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(result);
  return chain;
}

function makeInsertChain() {
  return {
    values: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUpdateChain() {
  return {
    set: jest.fn(() => ({
      where: jest.fn().mockResolvedValue(undefined),
    })),
  };
}

describe('seed-super-admin', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://example',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    SUPER_ADMIN_EMAIL: 'admin@example.com',
    SUPER_ADMIN_PASSWORD: 'password123',
    SUPER_ADMIN_FIRST_NAME: 'Super',
    SUPER_ADMIN_LAST_NAME: 'Admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...process.env, ...baseEnv };
  });

  it('requires seed env vars', () => {
    expect(() => requireSeedEnv({} as any)).toThrow('Missing required seed env vars');
  });

  it('seeds when no existing records', async () => {
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    (Pool as jest.Mock).mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    (drizzle as jest.Mock).mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
        updateUser: jest.fn().mockResolvedValue(undefined),
        findAccountByUserId: jest.fn().mockResolvedValue([]),
        linkAccount: jest.fn().mockResolvedValue(undefined),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    (createAuth as jest.Mock).mockResolvedValue({ $context: Promise.resolve(ctx) });

    await seedSuperAdmin();

    expect(ctx.internalAdapter.createUser).toHaveBeenCalled();
    expect(ctx.internalAdapter.linkAccount).toHaveBeenCalled();
    expect(poolEnd).toHaveBeenCalled();
  });

  it('updates existing user and account', async () => {
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    (Pool as jest.Mock).mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([{ id: 'person-1' }]))
        .mockReturnValueOnce(
          makeSelectChain([
            { id: 'user-1', personId: 'person-2', emailVerified: false, name: 'Old' },
          ]),
        )
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    (drizzle as jest.Mock).mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn(),
        updateUser: jest.fn().mockResolvedValue(undefined),
        findAccountByUserId: jest.fn().mockResolvedValue([
          { providerId: 'credential' },
        ]),
        linkAccount: jest.fn(),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    (createAuth as jest.Mock).mockResolvedValue({ $context: Promise.resolve(ctx) });

    await seedSuperAdmin();

    expect(ctx.internalAdapter.updateUser).toHaveBeenCalledTimes(2);
    expect(ctx.internalAdapter.updatePassword).toHaveBeenCalled();
    expect(poolEnd).toHaveBeenCalled();
  });

  it('skips updates when existing user matches and role exists', async () => {
    process.env.DB_SSL = 'true';
    process.env.SUPER_ADMIN_FIRST_NAME = ' ';
    process.env.SUPER_ADMIN_LAST_NAME = ' ';

    const poolEnd = jest.fn().mockResolvedValue(undefined);
    (Pool as jest.Mock).mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([{ id: 'person-1' }]))
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: 'user-1',
              personId: 'person-1',
              emailVerified: true,
              name: 'admin@example.com',
            },
          ]),
        )
        .mockReturnValueOnce(makeSelectChain([{ id: 'role-1' }])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    (drizzle as jest.Mock).mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn(),
        updateUser: jest.fn(),
        findAccountByUserId: jest.fn().mockResolvedValue([
          { providerId: 'credential' },
        ]),
        linkAccount: jest.fn(),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    (createAuth as jest.Mock).mockResolvedValue({ $context: Promise.resolve(ctx) });

    await seedSuperAdmin();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );
    expect(ctx.internalAdapter.createUser).not.toHaveBeenCalled();
    expect(ctx.internalAdapter.updateUser).not.toHaveBeenCalled();
    expect(poolEnd).toHaveBeenCalled();
  });

  it('throws when created user is missing id', async () => {
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    (Pool as jest.Mock).mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    (drizzle as jest.Mock).mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn().mockResolvedValue({}),
        updateUser: jest.fn(),
        findAccountByUserId: jest.fn().mockResolvedValue([]),
        linkAccount: jest.fn(),
        updatePassword: jest.fn(),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    (createAuth as jest.Mock).mockResolvedValue({ $context: Promise.resolve(ctx) });

    await expect(seedSuperAdmin()).rejects.toThrow('Failed to create super admin auth user');
    expect(poolEnd).toHaveBeenCalled();
  });

});
