import 'reflect-metadata';
import { PassThrough } from 'stream';
import type { IncomingMessage } from 'http';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { z } from 'zod';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AppModule } from '@/app.module';

import { AdminController } from '@/admin/admin.controller';
import { AdminService } from '@/admin/admin.service';
import { AdminModule } from '@/admin/admin.module';
import { provisionUserSchema } from '@/admin/admin.types';

import { AuthDevController } from '@/auth/auth-dev.controller';
import { AuthController } from '@/auth/auth.controller';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import {
  storeVerificationToken,
  getVerificationToken,
  clearVerificationToken,
} from '@/auth/verification-token.store';
import {
  storePasswordResetToken,
  getPasswordResetToken,
  clearPasswordResetToken,
} from '@/auth/password-reset-token.store';
import {
  account,
  accountRelations,
  jwks,
  people,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from '@/auth/better-auth.schema';
import { createTableRelationsHelpers } from 'drizzle-orm/relations';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { envSchema, validateEnv } from '@/config/env';

import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';
import { DatabaseService } from '@/db/db.service';
import {
  guardianships,
  parentProfiles,
  roleAssignments,
  staffProfiles,
  studentProfiles,
  users,
} from '@/db/schema';

import {
  RBAC_ROLES_KEY,
  RBAC_SCOPE_KEY,
  RequireRoles,
} from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import { RbacModule } from '@/rbac/rbac.module';
import { RbacService } from '@/rbac/rbac.service';
import { DEFAULT_SCOPE_ID, ROLES } from '@/rbac/rbac.types';

import { StudentsController } from '@/students/students.controller';
import { StudentsModule } from '@/students/students.module';
import { StudentsRepository } from '@/students/students.repository';
import { StudentsService } from '@/students/students.service';
import {
  createStudentSchema,
  updateStudentSchema,
} from '@/students/students.types';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health status', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});

describe('AppModule', () => {
  it('is defined', () => {
    expect(AppModule).toBeDefined();
  });
});

describe('main', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create: jest.fn() },
    }));
    process.env.NODE_ENV = 'test';
    process.env.BETTER_AUTH_BASE_PATH = '/auth';
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('@nestjs/core');
  });

  it('detects json content', async () => {
    const { hasJsonContent } = await import('@/main');
    const req = {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    } as IncomingMessage;
    expect(hasJsonContent(req)).toBe(true);
  });

  it('returns false for missing json content', async () => {
    const { hasJsonContent } = await import('@/main');
    const req = { headers: {} } as IncomingMessage;
    expect(hasJsonContent(req)).toBe(false);
  });

  it('falls back to default auth base path when env is unset', async () => {
    jest.resetModules();
    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create: jest.fn() },
    }));
    process.env.NODE_ENV = 'test';
    delete process.env.BETTER_AUTH_BASE_PATH;

    const { AUTH_BASE_PATH } = await import('@/main');
    expect(AUTH_BASE_PATH).toBe('/auth');
  });

  it('does not skip body parsing when path is undefined', async () => {
    const { shouldSkipBodyParser } = await import('@/main');
    expect(shouldSkipBodyParser(undefined)).toBe(false);
  });

  it('skips body parsing for auth path', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const middleware = app.use.mock.calls[0][0];
    const next = jest.fn();
    await middleware(
      { url: '/auth/session', method: 'POST', headers: {} },
      {},
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('parses json body and assigns req.body', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const req: any = Object.assign(new PassThrough(), {
      url: '/students',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const next = jest.fn();
    const promise = app.use.mock.calls[0][0](req, {}, next);
    req.emit('data', Buffer.from('{\"ok\":true}'));
    req.emit('end');
    await promise;

    expect(req.body).toEqual({ ok: true });
    expect(next).toHaveBeenCalledWith();
  });

  it('bails out for non-json and GET requests', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const next = jest.fn();
    await app.use.mock.calls[0][0](
      {
        url: '/students',
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      },
      {},
      next,
    );
    await app.use.mock.calls[0][0](
      { url: '/students', method: 'POST', headers: {} },
      {},
      next,
    );

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('passes errors from body parsing to next', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const next = jest.fn();
    const req: any = Object.assign(new PassThrough(), {
      url: '/students',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const promise = app.use.mock.calls[0][0](req, {}, next);
    req.emit('data', Buffer.from('{bad json}'));
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('reads json body from stream', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = {
      'content-type': 'application/json',
    } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from('{\"ok\":true}'));
    req.emit('end');

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('returns undefined when body is empty', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = {
      'content-type': 'application/json',
    } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
  });

  it('returns undefined for empty json payload', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = {
      'content-type': 'application/json',
    } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from(''));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects invalid json', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = {
      'content-type': 'application/json',
    } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from('{bad json}'));
    req.emit('end');

    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it('auto-bootstraps when not in test env', async () => {
    process.env.NODE_ENV = 'production';
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    await import('@/main');
    await new Promise((resolve) => setImmediate(resolve));

    expect(NestFactory.create).toHaveBeenCalled();
  });

  it('uses PORT when provided', async () => {
    process.env.PORT = '4000';
    const { NestFactory } = await import('@nestjs/core');
    const app = {
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    const main = await import('@/main');
    await main.bootstrap();

    expect(app.listen).toHaveBeenCalledWith('4000');
  });
});

describe('AdminController', () => {
  it('passes session and body to service', async () => {
    const adminService = {
      provisionUser: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new AdminController(adminService);
    const req = { authSession: { user: { id: 'u1' } } } as any;

    await controller.provisionUser(req, {
      role: 'ADMIN',
      personId: 'p1',
    } as any);

    expect(adminService.provisionUser).toHaveBeenCalledWith(req.authSession, {
      role: 'ADMIN',
      personId: 'p1',
    });
  });

  it('falls back to null session when missing', async () => {
    const adminService = {
      provisionUser: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new AdminController(adminService);
    const req = {} as any;

    await controller.provisionUser(req, {
      role: 'ADMIN',
      personId: 'p1',
    } as any);

    expect(adminService.provisionUser).toHaveBeenCalledWith(null, {
      role: 'ADMIN',
      personId: 'p1',
    });
  });
});

describe('AdminModule', () => {
  it('is defined', () => {
    expect(AdminModule).toBeDefined();
  });
});

describe('AdminService', () => {
  const session = { user: { id: 'actor', emailVerified: true } } as any;
  const personRow = {
    id: 'person-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    isDeleted: false,
  } as any;
  const makeSelectChain = (result: unknown[]) => {
    const chain: any = {};
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockResolvedValue(result);
    return chain;
  };
  const makeTx = () => {
    return {
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    };
  };

  it('rejects unauthenticated actor', async () => {
    const service = new AdminService({} as any, {} as any, {} as any);
    await expect(service.provisionUser(null, {} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects insufficient privileges', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['STUDENT'])),
      canProvisionRole: jest.fn().mockReturnValue(false),
    } as any;
    const db = { select: jest.fn() } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires student reset redirect', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = { select: jest.fn() } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'STUDENT',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when person is missing', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = {
      select: jest.fn().mockReturnValueOnce(makeSelectChain([])),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects email mismatch', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([personRow]))
        .mockReturnValueOnce(makeSelectChain([])),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
        email: 'other@example.com',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires email when missing on person', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([{ ...personRow, email: null }]))
        .mockReturnValueOnce(makeSelectChain([])),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when auth user already exists', async () => {
    const authService = {} as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([personRow]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }])),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when auth user creation fails', async () => {
    const authService = {
      createEmailPasswordUser: jest.fn().mockResolvedValue(null),
    } as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([personRow]))
        .mockReturnValueOnce(makeSelectChain([])),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await expect(
      service.provisionUser(session, {
        role: 'ADMIN',
        personId: 'p1',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('provisions a student and requests password reset', async () => {
    const authService = {
      createEmailPasswordUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      issueEmailVerificationToken: jest.fn().mockResolvedValue('token'),
      requestPasswordReset: jest.fn().mockResolvedValue({ ok: true }),
    } as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const tx = makeTx();
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([personRow]))
        .mockReturnValueOnce(makeSelectChain([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    const result = await service.provisionUser(session, {
      role: 'STUDENT',
      personId: 'p1',
      passwordResetRedirectTo: 'https://reset',
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        personId: 'person-1',
        role: 'STUDENT',
      }),
    );
    expect(authService.issueEmailVerificationToken).toHaveBeenCalled();
    expect(authService.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ada@example.com',
      redirectTo: 'https://reset',
    });
  });

  it('provisions staff roles and pending', async () => {
    const authService = {
      createEmailPasswordUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      issueEmailVerificationToken: jest.fn().mockResolvedValue('token'),
      requestPasswordReset: jest.fn(),
    } as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const tx = makeTx();
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([personRow]))
        .mockReturnValueOnce(makeSelectChain([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await service.provisionUser(session, {
      role: 'ADMIN',
      personId: 'p1',
    } as any);

    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
    expect(authService.issueEmailVerificationToken).toHaveBeenCalled();
  });

  it('falls back to email when name is blank', async () => {
    const authService = {
      createEmailPasswordUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      issueEmailVerificationToken: jest.fn().mockResolvedValue('token'),
      requestPasswordReset: jest.fn(),
    } as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const tx = makeTx();
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(
          makeSelectChain([{ ...personRow, firstName: ' ', lastName: ' ' }]),
        )
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await service.provisionUser(session, {
      role: 'ADMIN',
      personId: 'p1',
    } as any);

    expect(authService.createEmailPasswordUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ada@example.com' }),
    );
  });

  it('updates person email when missing', async () => {
    const authService = {
      createEmailPasswordUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
      issueEmailVerificationToken: jest.fn().mockResolvedValue('token'),
      requestPasswordReset: jest.fn(),
    } as any;
    const rbacService = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['SUPER_ADMIN'])),
      canProvisionRole: jest.fn().mockReturnValue(true),
    } as any;
    const tx = makeTx();
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([{ ...personRow, email: null }]))
        .mockReturnValueOnce(makeSelectChain([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new AdminService(authService, rbacService, db);
    await service.provisionUser(session, {
      role: 'ADMIN',
      personId: 'p1',
      email: 'new@example.com',
    } as any);

    expect(tx.update).toHaveBeenCalledTimes(2);
  });
});

describe('provisionUserSchema', () => {
  it('parses student payload with defaults', () => {
    const result = provisionUserSchema.parse({
      role: 'STUDENT',
      personId: 'p1',
      passwordResetRedirectTo: 'https://example.com/reset',
    });

    expect(result.scopeId).toBe('GLOBAL');
    expect(result.role).toBe('STUDENT');
  });

  it('parses staff payload', () => {
    const result = provisionUserSchema.parse({
      role: 'ADMIN',
      personId: 'p1',
      email: 'user@example.com',
    });

    expect(result.role).toBe('ADMIN');
  });
});

describe('AuthDevController', () => {
  beforeEach(() => {
    clearVerificationToken('user@example.com');
  });

  it('throws when email is missing', () => {
    const controller = new AuthDevController();
    expect(() => controller.getVerificationCode()).toThrow('email is required');
  });

  it('throws when token is missing', () => {
    const controller = new AuthDevController();
    expect(() => controller.getVerificationCode('missing@example.com')).toThrow(
      'verification code not found',
    );
  });

  it('returns normalized email and token', () => {
    const controller = new AuthDevController();
    storeVerificationToken('User@Example.com', 'token-1');

    const result = controller.getVerificationCode('USER@example.com');
    expect(result).toEqual({
      email: 'user@example.com',
      token: 'token-1',
      createdAt: expect.any(String),
    });
  });
});

describe('auth constants', () => {
  it('exposes auth instance token', () => {
    expect(AUTH_INSTANCE).toBe('AUTH_INSTANCE');
  });
});

describe('AuthController', () => {
  it('forwards requests to AuthService', async () => {
    const authService = { handle: jest.fn() } as any;
    const controller = new AuthController(authService);
    const req = {} as any;
    const res = {} as any;

    await controller.handle(req, res);

    expect(authService.handle).toHaveBeenCalledWith(req, res);
  });
});

describe('AuthModule', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/auth/better-auth.config', () => ({
      createAuth: jest.fn().mockResolvedValue({}),
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('@/auth/better-auth.config');
  });

  it('creates auth instance with config values', async () => {
    const { AuthModule } = require('@/auth/auth.module');
    const { createAuth } = require('@/auth/better-auth.config');
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AuthModule,
    ) as any[];
    const authProvider = providers.find(
      (provider) => provider.provide === AUTH_INSTANCE,
    );

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

describe('AuthService', () => {
  let AuthServiceImpl: any;
  let handlerFactory: any;
  let verificationTokenFactory: any;
  let storeVerificationTokenMock: jest.Mock;
  let toNodeHandler: jest.Mock;
  let createEmailVerificationToken: jest.Mock;

  const auth = {
    api: {
      getSession: jest.fn(),
      requestPasswordReset: jest.fn(),
    },
    $context: Promise.resolve({
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
      internalAdapter: {
        createUser: jest.fn(),
        linkAccount: jest.fn(),
      },
    }),
  } as any;

  beforeEach(async () => {
    jest.resetModules();
    toNodeHandler = jest.fn(() => jest.fn());
    createEmailVerificationToken = jest.fn(() => 'token-raw');

    jest.doMock('better-auth/node', () => ({
      toNodeHandler,
    }));

    jest.doMock('better-auth/api', () => ({
      createEmailVerificationToken,
    }));

    jest.doMock('@/auth/verification-token.store', () => ({
      storeVerificationToken: jest.fn(),
    }));

    ({
      AuthService: AuthServiceImpl,
      handlerFactory,
      verificationTokenFactory,
    } = require('@/auth/auth.service'));
    ({
      storeVerificationToken: storeVerificationTokenMock,
    } = require('@/auth/verification-token.store'));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('better-auth/node');
    jest.unmock('better-auth/api');
    jest.unmock('@/auth/verification-token.store');
  });

  it('memoizes the node handler', async () => {
    const service = new AuthServiceImpl(auth);
    const req: any = {};
    const res: any = {};
    const handler = jest.fn();

    handlerFactory.create = jest.fn().mockResolvedValue(handler);

    await service.handle(req, res);
    await service.handle(req, res);

    expect(handlerFactory.create).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('maps request headers to getSession', async () => {
    auth.api.getSession.mockResolvedValue({
      user: { id: 'u1', emailVerified: true },
    });
    const service = new AuthServiceImpl(auth);

    const session = await service.getSession({
      headers: { authorization: 'Bearer x', accept: ['a', 'b'] },
    } as any);

    expect(auth.api.getSession).toHaveBeenCalled();
    expect(session).toEqual({ user: { id: 'u1', emailVerified: true } });
  });

  it('ignores falsy header values', async () => {
    auth.api.getSession.mockResolvedValue({
      user: { id: 'u1', emailVerified: true },
    });
    const service = new AuthServiceImpl(auth);

    await service.getSession({
      headers: { authorization: '', 'x-empty': undefined },
    } as any);

    expect(auth.api.getSession).toHaveBeenCalled();
  });

  it('creates an email/password user', async () => {
    const ctx = await auth.$context;
    ctx.internalAdapter.createUser.mockResolvedValue({ id: 'u1' });
    const service = new AuthServiceImpl(auth);

    const user = await service.createEmailPasswordUser({
      name: 'Ada',
      email: ' ADA@EXAMPLE.COM ',
      password: 'secret',
    });

    expect(ctx.password.hash).toHaveBeenCalled();
    expect(ctx.internalAdapter.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com' }),
    );
    expect(ctx.internalAdapter.linkAccount).toHaveBeenCalled();
    expect(user).toEqual({ id: 'u1' });
  });

  it('returns null when user creation fails', async () => {
    const ctx = await auth.$context;
    ctx.internalAdapter.createUser.mockResolvedValue(null);
    const service = new AuthServiceImpl(auth);

    await expect(
      service.createEmailPasswordUser({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret',
      }),
    ).resolves.toBeNull();
  });

  it('issues verification tokens', async () => {
    const service = new AuthServiceImpl(auth);
    verificationTokenFactory.create = jest.fn().mockResolvedValue('token-123');

    await expect(
      service.issueEmailVerificationToken({ email: 'user@example.com' }),
    ).resolves.toBe('token-123');

    expect(storeVerificationTokenMock).toHaveBeenCalledWith(
      'user@example.com',
      'token-123',
    );
  });

  it('requests password reset', async () => {
    const service = new AuthServiceImpl(auth);
    auth.api.requestPasswordReset.mockResolvedValue({ ok: true });

    const result = await service.requestPasswordReset({
      email: 'user@example.com',
    });
    expect(result).toEqual({ ok: true });
  });

  it('creates handler via factory', async () => {
    const handler = await handlerFactory.create(auth);
    expect(handler).toBeInstanceOf(Function);
  });

  it('creates verification token via factory', async () => {
    const token = await verificationTokenFactory.create(
      'secret',
      'user@example.com',
      3600,
    );
    expect(typeof token).toBe('string');
  });
});

describe('createAuth', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/auth/password-reset-token.store', () => ({
      storePasswordResetToken: jest.fn(),
    }));
    jest.doMock('@/auth/verification-token.store', () => ({
      storeVerificationToken: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('@/auth/password-reset-token.store');
    jest.unmock('@/auth/verification-token.store');
  });

  it('configures better-auth and token callbacks', async () => {
    const { createAuth } = require('@/auth/better-auth.config');
    const {
      storePasswordResetToken: storePasswordResetTokenMock,
    } = require('@/auth/password-reset-token.store');
    const {
      storeVerificationToken: storeVerificationTokenMock,
    } = require('@/auth/verification-token.store');
    const { betterAuth } = jest.requireMock('better-auth/minimal') as {
      betterAuth: jest.Mock;
    };
    const { drizzleAdapter } = jest.requireMock(
      'better-auth/adapters/drizzle',
    ) as {
      drizzleAdapter: jest.Mock;
    };
    const { bearer } = jest.requireMock('better-auth/plugins/bearer') as {
      bearer: jest.Mock;
    };
    const { jwt } = jest.requireMock('better-auth/plugins/jwt') as {
      jwt: jest.Mock;
    };

    const env: any = {
      BETTER_AUTH_BASE_URL: 'http://localhost',
      BETTER_AUTH_BASE_PATH: '/auth',
      BETTER_AUTH_SECRET: 'secret',
      BETTER_AUTH_JWT_ISSUER: 'issuer',
      BETTER_AUTH_JWT_AUDIENCE: 'aud',
      BETTER_AUTH_JWT_ACCESS_TTL: '15m',
      APP_TIMEZONE: 'UTC',
      HRMS_ALLOWED_ROLES: 'SUPER_ADMIN,ADMIN',
    };

    await createAuth({} as any, env, {
      betterAuth,
      drizzleAdapter,
      bearer,
      jwt,
    });

    expect(betterAuth).toHaveBeenCalled();
    const config = betterAuth.mock.calls[0][0];

    await config.emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com' },
      token: 't',
      url: 'http://reset',
    });
    expect(storePasswordResetTokenMock).toHaveBeenCalledWith(
      'user@example.com',
      't',
      'http://reset',
    );

    await config.emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com' },
      token: 'v',
    });
    expect(storeVerificationTokenMock).toHaveBeenCalledWith(
      'user@example.com',
      'v',
    );
    expect(config.disabledPaths).toEqual(['/send-verification-email']);

    const definePayload = jwt.mock.calls[0][0].jwt.definePayload;
    const payloadWithRole = definePayload({ user: { role: 'ADMIN' } });
    const payloadWithoutRole = definePayload({ user: {} });
    expect(payloadWithRole).toEqual({ role: 'ADMIN' });
    expect(payloadWithoutRole).toEqual({ role: 'user' });
  });

  it('loads factories when not provided', async () => {
    const { createAuth } = require('@/auth/better-auth.config');
    const { betterAuth } = jest.requireMock('better-auth/minimal') as {
      betterAuth: jest.Mock;
    };

    const env: any = {
      BETTER_AUTH_BASE_URL: '',
      BETTER_AUTH_BASE_PATH: '/auth',
      BETTER_AUTH_SECRET: 'secret',
      BETTER_AUTH_JWT_ISSUER: 'issuer',
      BETTER_AUTH_JWT_AUDIENCE: 'aud',
      BETTER_AUTH_JWT_ACCESS_TTL: '15m',
      APP_TIMEZONE: 'UTC',
      HRMS_ALLOWED_ROLES: 'SUPER_ADMIN,ADMIN',
    };

    await createAuth({} as any, env);

    expect(betterAuth).toHaveBeenCalled();
  });
});

describe('better-auth schema', () => {
  it('exports tables', () => {
    expect(people).toBeDefined();
    expect(user).toBeDefined();
    expect(session).toBeDefined();
    expect(account).toBeDefined();
    expect(verification).toBeDefined();
    expect(jwks).toBeDefined();
  });

  it('executes extra config builders', () => {
    const peopleBuilder = people[Symbol.for('drizzle:ExtraConfigBuilder')];
    const peopleCols = people[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(peopleBuilder(peopleCols)).toHaveLength(1);

    const sessionBuilder = session[Symbol.for('drizzle:ExtraConfigBuilder')];
    const sessionCols = session[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(sessionBuilder(sessionCols)).toHaveLength(1);

    const accountBuilder = account[Symbol.for('drizzle:ExtraConfigBuilder')];
    const accountCols = account[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(accountBuilder(accountCols)).toHaveLength(1);

    const verificationBuilder =
      verification[Symbol.for('drizzle:ExtraConfigBuilder')];
    const verificationCols =
      verification[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(verificationBuilder(verificationCols)).toHaveLength(1);
  });

  it('executes onUpdate functions', () => {
    expect(people.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(user.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(session.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(account.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(verification.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  it('executes foreign key references', () => {
    const userFks = user[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
      reference: () => unknown;
    }>;
    const sessionFks = session[
      Symbol.for('drizzle:PgInlineForeignKeys')
    ] as Array<{
      reference: () => unknown;
    }>;
    const accountFks = account[
      Symbol.for('drizzle:PgInlineForeignKeys')
    ] as Array<{
      reference: () => unknown;
    }>;

    userFks.forEach((fk) => fk.reference());
    sessionFks.forEach((fk) => fk.reference());
    accountFks.forEach((fk) => fk.reference());
  });

  it('enables RLS on tables', () => {
    people.enableRLS();
    user.enableRLS();
    session.enableRLS();
    account.enableRLS();
    verification.enableRLS();
    jwks.enableRLS();
  });

  it('builds relation configs', () => {
    const userConfig = userRelations.config(createTableRelationsHelpers(user));
    const sessionConfig = sessionRelations.config(
      createTableRelationsHelpers(session),
    );
    const accountConfig = accountRelations.config(
      createTableRelationsHelpers(account),
    );

    expect(userConfig.sessions.fieldName).toBe('sessions');
    expect(userConfig.accounts.fieldName).toBe('accounts');
    expect(sessionConfig.user.fieldName).toBe('user');
    expect(accountConfig.user.fieldName).toBe('user');
  });
});

describe('verification-token.store', () => {
  it('stores and clears normalized tokens', () => {
    storeVerificationToken('  USER@Example.com ', 'token-1');
    const entry = getVerificationToken('user@example.com');
    expect(entry?.token).toBe('token-1');

    clearVerificationToken('USER@example.com');
    expect(getVerificationToken('user@example.com')).toBeUndefined();
  });
});

describe('password-reset-token.store', () => {
  it('stores and clears normalized tokens', () => {
    storePasswordResetToken('  User@Example.com ', 'token', 'http://reset');
    const entry = getPasswordResetToken('user@example.com');
    expect(entry?.token).toBe('token');
    expect(entry?.url).toBe('http://reset');

    clearPasswordResetToken('USER@example.com');
    expect(getPasswordResetToken('user@example.com')).toBeUndefined();
  });
});

describe('ZodValidationPipe', () => {
  it('returns parsed data when valid', () => {
    const schema = z.object({ name: z.string().min(1) });
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ name: 'Ada' })).toEqual({ name: 'Ada' });
  });

  it('throws BadRequestException with combined message', () => {
    const schema = z.object({ name: z.string().min(2), age: z.number().int() });
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ name: 'A', age: 'nope' })).toThrow(
      BadRequestException,
    );
    try {
      pipe.transform({ name: 'A', age: 'nope' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('Too small');
      expect((error as BadRequestException).message).toContain('Invalid input');
    }
  });
});

describe('env', () => {
  const baseEnv = {
    DATABASE_URL: 'postgres://example',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
  };

  it('parses defaults and coerces types', () => {
    const parsed = validateEnv({
      ...baseEnv,
      DB_SSL: 'true',
      DB_LOG_QUERIES: 'false',
      PORT: '4000',
    });

    expect(parsed.PORT).toBe(4000);
    expect(parsed.DB_SSL).toBe(true);
    expect(parsed.DB_LOG_QUERIES).toBe(false);
    expect(parsed.BETTER_AUTH_BASE_PATH).toBe('/auth');
  });

  it('rejects missing required values', () => {
    expect(() => validateEnv({})).toThrow();
  });

  it('accepts empty base url', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      BETTER_AUTH_BASE_URL: '',
    });
    expect(parsed.BETTER_AUTH_BASE_URL).toBe('');
  });
});

describe('db.constants', () => {
  it('exports tokens', () => {
    expect(PG_POOL).toBe('PG_POOL');
    expect(DRIZZLE_DB).toBe('DRIZZLE_DB');
  });
});

describe('DatabaseModule', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('pg', () => ({
      Pool: jest.fn(),
    }));
    jest.doMock('drizzle-orm/node-postgres', () => ({
      drizzle: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('pg');
    jest.unmock('drizzle-orm/node-postgres');
  });

  it('creates the PG pool with SSL disabled', async () => {
    const { DatabaseModule } = require('@/db/db.module');
    const { Pool } = require('pg');
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DatabaseModule,
    ) as any[];
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

  it('creates drizzle db with logger', async () => {
    const { DatabaseModule } = require('@/db/db.module');
    const { drizzle } = require('drizzle-orm/node-postgres');
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DatabaseModule,
    ) as any[];
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

    expect(drizzle).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ logger: true }),
    );
  });

  it('enables SSL when configured', async () => {
    const { DatabaseModule } = require('@/db/db.module');
    const { Pool } = require('pg');
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      DatabaseModule,
    ) as any[];
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

describe('DatabaseService', () => {
  it('closes the pool on destroy', async () => {
    const pool = { end: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new DatabaseService(pool);

    await service.onModuleDestroy();
    expect(pool.end).toHaveBeenCalled();
  });
});

describe('db schema', () => {
  it('exports core tables', () => {
    expect(users).toBeDefined();
    expect(roleAssignments).toBeDefined();
    expect(studentProfiles).toBeDefined();
    expect(guardianships).toBeDefined();
  });

  it('executes extra config builders', () => {
    const builder = users[Symbol.for('drizzle:ExtraConfigBuilder')];
    const extraCols = users[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(builder(extraCols)).toHaveLength(1);

    const roleBuilder =
      roleAssignments[Symbol.for('drizzle:ExtraConfigBuilder')];
    const roleCols = roleAssignments[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(roleBuilder(roleCols)).toHaveLength(4);

    const guardianBuilder =
      guardianships[Symbol.for('drizzle:ExtraConfigBuilder')];
    const guardianCols =
      guardianships[Symbol.for('drizzle:ExtraConfigColumns')];
    expect(guardianBuilder(guardianCols)).toHaveLength(1);
  });

  it('executes onUpdate functions', () => {
    expect(studentProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(parentProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(staffProfiles.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  it('executes foreign key references', () => {
    const tables = [
      roleAssignments,
      studentProfiles,
      parentProfiles,
      staffProfiles,
      guardianships,
    ];
    tables.forEach((table) => {
      const fks = table[Symbol.for('drizzle:PgInlineForeignKeys')] as Array<{
        reference: () => unknown;
      }>;
      fks.forEach((fk) => fk.reference());
    });
  });
});

describe('seed-super-admin', () => {
  let seedSuperAdmin: any;
  let requireSeedEnv: any;
  let createAuth: jest.Mock;
  let drizzle: jest.Mock;
  let Pool: jest.Mock;

  const baseEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://example',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    SUPER_ADMIN_EMAIL: 'admin@example.com',
    SUPER_ADMIN_PASSWORD: 'password123',
    SUPER_ADMIN_FIRST_NAME: 'Super',
    SUPER_ADMIN_LAST_NAME: 'Admin',
  };

  const makeSelectChain = (result: unknown[]) => {
    const chain: any = {};
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockResolvedValue(result);
    return chain;
  };

  const makeInsertChain = () => {
    return {
      values: jest.fn().mockResolvedValue(undefined),
    };
  };

  const makeUpdateChain = () => {
    return {
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    };
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.doMock('@/auth/better-auth.config', () => ({
      createAuth: jest.fn(),
    }));
    jest.doMock('drizzle-orm/node-postgres', () => ({
      drizzle: jest.fn(),
    }));
    jest.doMock('pg', () => ({
      Pool: jest.fn(),
    }));

    process.env = { ...process.env, ...baseEnv };

    ({ seedSuperAdmin, requireSeedEnv } = require('@/db/seed-super-admin'));
    ({ createAuth } = require('@/auth/better-auth.config'));
    ({ drizzle } = require('drizzle-orm/node-postgres'));
    ({ Pool } = require('pg'));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('@/auth/better-auth.config');
    jest.unmock('drizzle-orm/node-postgres');
    jest.unmock('pg');
  });

  it('requires seed env vars', () => {
    expect(() => requireSeedEnv({} as any)).toThrow(
      'Missing required seed env vars',
    );
  });

  it('seeds when no existing records', async () => {
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    Pool.mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    drizzle.mockReturnValue(db);

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

    createAuth.mockResolvedValue({ $context: Promise.resolve(ctx) });

    await seedSuperAdmin();

    expect(ctx.internalAdapter.createUser).toHaveBeenCalled();
    expect(ctx.internalAdapter.linkAccount).toHaveBeenCalled();
    expect(poolEnd).toHaveBeenCalled();
  });

  it('updates existing user and account', async () => {
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    Pool.mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([{ id: 'person-1' }]))
        .mockReturnValueOnce(
          makeSelectChain([
            {
              id: 'user-1',
              personId: 'person-2',
              emailVerified: false,
              name: 'Old',
            },
          ]),
        )
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    drizzle.mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn(),
        updateUser: jest.fn().mockResolvedValue(undefined),
        findAccountByUserId: jest
          .fn()
          .mockResolvedValue([{ providerId: 'credential' }]),
        linkAccount: jest.fn(),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    createAuth.mockResolvedValue({ $context: Promise.resolve(ctx) });

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
    Pool.mockReturnValue({ end: poolEnd });

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

    drizzle.mockReturnValue(db);

    const ctx = {
      secret: 'secret',
      options: { emailVerification: { expiresIn: '1h' } },
      internalAdapter: {
        createUser: jest.fn(),
        updateUser: jest.fn(),
        findAccountByUserId: jest
          .fn()
          .mockResolvedValue([{ providerId: 'credential' }]),
        linkAccount: jest.fn(),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      password: { hash: jest.fn().mockResolvedValue('hashed') },
    };

    createAuth.mockResolvedValue({ $context: Promise.resolve(ctx) });

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
    Pool.mockReturnValue({ end: poolEnd });

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([]))
        .mockReturnValueOnce(makeSelectChain([])),
      insert: jest.fn().mockReturnValue(makeInsertChain()),
      update: jest.fn().mockReturnValue(makeUpdateChain()),
    } as any;

    drizzle.mockReturnValue(db);

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

    createAuth.mockResolvedValue({ $context: Promise.resolve(ctx) });

    await expect(seedSuperAdmin()).rejects.toThrow(
      'Failed to create super admin auth user',
    );
    expect(poolEnd).toHaveBeenCalled();
  });
});

describe('rbac types', () => {
  it('defines roles and default scope', () => {
    expect(DEFAULT_SCOPE_ID).toBe('GLOBAL');
    expect(ROLES).toContain('SUPER_ADMIN');
  });
});

class TestController {
  @RequireRoles('ADMIN', 'SCOPE')
  handler() {
    return 'ok';
  }
}

describe('RequireRoles', () => {
  it('sets roles and scope metadata', () => {
    const roles = Reflect.getMetadata(
      RBAC_ROLES_KEY,
      TestController.prototype.handler,
    );
    const scope = Reflect.getMetadata(
      RBAC_SCOPE_KEY,
      TestController.prototype.handler,
    );

    expect(roles).toEqual(['ADMIN']);
    expect(scope).toBe('SCOPE');
  });
});

describe('RbacModule', () => {
  it('is defined', () => {
    expect(RbacModule).toBeDefined();
  });
});

describe('Rbac guards', () => {
  const makeContext = (req: any) => {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('VerifiedUserGuard rejects unauthenticated', async () => {
    const authService = {
      getSession: jest.fn().mockResolvedValue(null),
    } as any;
    const rbacService = { requireVerifiedUser: jest.fn() } as any;
    const guard = new VerifiedUserGuard(authService, rbacService);

    await expect(guard.canActivate(makeContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('VerifiedUserGuard sets session on request', async () => {
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const authService = {
      getSession: jest.fn().mockResolvedValue(session),
    } as any;
    const rbacService = { requireVerifiedUser: jest.fn() } as any;
    const guard = new VerifiedUserGuard(authService, rbacService);
    const req: any = {};

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.authSession).toBe(session);
  });

  it('RolesGuard allows when no roles are required', async () => {
    const { Reflector } = await import('@nestjs/core');
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined as any);
    const guard = new RolesGuard({} as any, {} as any, reflector);

    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
  });

  it('RolesGuard uses session from request', async () => {
    const { Reflector } = await import('@nestjs/core');
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(undefined as any);

    const authService = { getSession: jest.fn() } as any;
    const rbacService = {
      requireRole: jest.fn().mockResolvedValue(new Set()),
    } as any;
    const guard = new RolesGuard(authService, rbacService, reflector);
    const req: any = { authSession: session };

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(authService.getSession).not.toHaveBeenCalled();
    expect(rbacService.requireRole).toHaveBeenCalledWith(
      session,
      ['ADMIN'],
      'GLOBAL',
    );
  });

  it('RolesGuard pulls scope metadata', async () => {
    const { Reflector } = await import('@nestjs/core');
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce('SCOPE');

    const authService = {
      getSession: jest
        .fn()
        .mockResolvedValue({ user: { id: 'u1', emailVerified: true } }),
    } as any;
    const rbacService = {
      requireRole: jest.fn().mockResolvedValue(new Set()),
    } as any;
    const guard = new RolesGuard(authService, rbacService, reflector);
    const req: any = {};

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(rbacService.requireRole).toHaveBeenCalledWith(
      expect.anything(),
      ['ADMIN'],
      'SCOPE',
    );
  });

  it('RolesGuard fetches session when missing on request', async () => {
    const { Reflector } = await import('@nestjs/core');
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(undefined as any);

    const authService = {
      getSession: jest.fn().mockResolvedValue(session),
    } as any;
    const rbacService = {
      requireRole: jest.fn().mockResolvedValue(new Set()),
    } as any;
    const guard = new RolesGuard(authService, rbacService, reflector);
    const req: any = {};

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(authService.getSession).toHaveBeenCalled();
    expect(req.authSession).toBe(session);
  });
});

describe('RbacService', () => {
  const makeSelectChain = (result: unknown[]) => {
    const chain: any = {};
    chain.from = jest.fn().mockReturnValue(chain);
    chain.where = jest.fn().mockResolvedValue(result);
    return chain;
  };

  it('returns user scope roles', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'ADMIN' }])),
    } as any;
    const service = new RbacService(db);

    const roles = await service.getUserScopeRoles('user-1');
    expect(roles.has('ADMIN')).toBe(true);
  });

  it('requires verified users', () => {
    const service = new RbacService({} as any);
    expect(() => service.requireVerifiedUser(null)).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      service.requireVerifiedUser({ user: { emailVerified: false } } as any),
    ).toThrow(ForbiddenException);
  });

  it('requires a role', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'ADMIN' }])),
    } as any;
    const service = new RbacService(db);
    const session = { user: { id: 'u1', emailVerified: true } } as any;

    const roles = await service.requireRole(session, ['ADMIN']);
    expect(roles.has('ADMIN')).toBe(true);
  });

  it('rejects missing roles', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'STUDENT' }])),
    } as any;
    const service = new RbacService(db);
    const session = { user: { id: 'u1', emailVerified: true } } as any;

    await expect(
      service.requireRole(session, ['ADMIN']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks provisioning rules', () => {
    const service = new RbacService({} as any);
    expect(service.canProvisionRole(new Set(['SUPER_ADMIN']), 'ADMIN')).toBe(
      true,
    );
    expect(service.canProvisionRole(new Set(['ADMIN']), 'SUPER_ADMIN')).toBe(
      false,
    );
    expect(service.canProvisionRole(new Set(['ADMIN']), 'STAFF')).toBe(true);
    expect(service.canProvisionRole(new Set(['STUDENT']), 'ADMIN')).toBe(false);
  });
});

describe('StudentsController', () => {
  it('passes query params to service', async () => {
    const service = {
      getAll: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({}),
      createOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest
        .fn()
        .mockResolvedValue({ removed: true, hardDelete: false }),
      restoreOne: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new StudentsController(service);
    const req = { authSession: { user: { id: 'u1' } } } as any;

    await controller.getStudents(req, 'true');
    await controller.getStudent(req, 'p1');
    await controller.createStudent(req, {
      firstName: 'Ada',
      lastName: 'Lovelace',
    } as any);
    await controller.updateStudent(req, 'p1', { firstName: 'Ada' } as any);
    await controller.deleteStudent(req, 'p1', 'true');
    await controller.restoreStudent(req, 'p1');

    expect(service.getAll).toHaveBeenCalledWith(req.authSession, true);
    expect(service.getOne).toHaveBeenCalledWith(req.authSession, 'p1');
    expect(service.createOne).toHaveBeenCalled();
    expect(service.updateOne).toHaveBeenCalledWith(req.authSession, 'p1', {
      firstName: 'Ada',
    });
    expect(service.deleteOne).toHaveBeenCalledWith(req.authSession, 'p1', true);
    expect(service.restoreOne).toHaveBeenCalledWith(req.authSession, 'p1');
  });

  it('defaults includeDeleted and hard delete when params are missing', async () => {
    const service = {
      getAll: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue({}),
      createOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest
        .fn()
        .mockResolvedValue({ removed: true, hardDelete: false }),
      restoreOne: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new StudentsController(service);
    const req = {} as any;

    await controller.getStudents(req, undefined);
    await controller.deleteStudent(req, 'p1', undefined);

    expect(service.getAll).toHaveBeenCalledWith(null, false);
    expect(service.deleteOne).toHaveBeenCalledWith(null, 'p1', false);
  });
});

describe('StudentsModule', () => {
  it('is defined', () => {
    expect(StudentsModule).toBeDefined();
  });
});

describe('StudentsRepository', () => {
  const makeQuery = (rows: unknown[]) => {
    const query: any = {};
    query.from = jest.fn().mockReturnValue(query);
    query.innerJoin = jest.fn().mockReturnValue(query);
    query.leftJoin = jest.fn().mockReturnValue(query);
    query.where = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.returning = jest.fn().mockReturnValue(query);
    query.then = (resolve: any, reject: any) =>
      Promise.resolve(rows).then(resolve, reject);
    return query;
  };

  const makeInsertQuery = (rows: unknown[]) => {
    const query = makeQuery(rows);
    query.values = jest.fn().mockReturnValue(query);
    return query;
  };

  const makeUpdateQuery = () => {
    return {
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    };
  };

  const makeDeleteQuery = (rows: unknown[]) => {
    const query = makeQuery(rows);
    query.where = jest.fn().mockReturnValue(query);
    query.returning = jest.fn().mockReturnValue(query);
    return query;
  };

  const sampleRow = {
    personId: 'p1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    emailVerified: true,
    phone: null,
    avatar: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
    lat: null,
    lng: null,
    dob: null,
    gender: null,
    learningGoal: null,
    intendedSubject: null,
    leadId: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('throws when email already exists', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([{ id: 'p2' }])),
    } as any;
    const repo = new StudentsRepository(db);

    await expect(
      repo.create({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      }),
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('creates a student', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async (callback: any) => {
        const tx = {
          insert: jest
            .fn()
            .mockReturnValueOnce(makeInsertQuery([{ ...sampleRow, id: 'p1' }]))
            .mockReturnValueOnce(
              makeInsertQuery([
                {
                  personId: 'p1',
                  dob: null,
                  gender: null,
                  learningGoal: null,
                  intendedSubject: null,
                  leadId: null,
                  isDeleted: false,
                  deletedAt: null,
                  createdAt: sampleRow.createdAt,
                  updatedAt: sampleRow.updatedAt,
                },
              ]),
            ),
        };
        return callback(tx);
      }),
    } as any;

    const repo = new StudentsRepository(db);
    const result = await repo.create({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '',
    });

    expect(result.personId).toBe('p1');
    expect(result.emailVerified).toBe(false);
  });

  it('maps unique violations to EMAIL_EXISTS', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async () => {
        const error: any = new Error('unique');
        error.code = '23505';
        error.constraint = 'people_email_unique';
        throw error;
      }),
    } as any;

    const repo = new StudentsRepository(db);
    await expect(
      repo.create({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      }),
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('rethrows non-unique errors', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async () => {
        throw 'boom';
      }),
    } as any;

    const repo = new StudentsRepository(db);
    await expect(
      repo.create({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      }),
    ).rejects.toBe('boom');
  });

  it('finds all students with and without deleted', async () => {
    const query = makeQuery([sampleRow]);
    const db = { select: jest.fn().mockReturnValue(query) } as any;
    const repo = new StudentsRepository(db);

    const active = await repo.findAll(false);
    const all = await repo.findAll(true);

    expect(active).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(query.where).toHaveBeenCalled();
  });

  it('finds by id', async () => {
    const db = { select: jest.fn().mockReturnValue(makeQuery([])) } as any;
    const repo = new StudentsRepository(db);

    await expect(repo.findById('missing')).resolves.toBeUndefined();
  });

  it('rejects duplicate email on update', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([{ id: 'p2' }])),
    } as any;
    const repo = new StudentsRepository(db);

    await expect(
      repo.update('p1', { email: 'ada@example.com' }),
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('updates student fields and returns result', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.update('p1', {
      firstName: 'New',
      dob: '2024-01-01',
    });
    expect(result?.firstName).toBe('Ada');
    expect(tx.update).toHaveBeenCalledTimes(2);
  });

  it('updates individual people fields', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn(() => makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const payloads = [
      { firstName: 'New' },
      { lastName: 'Last' },
      { email: 'new@example.com' },
      { phone: '123' },
      { avatar: 'avatar' },
      { addressLine1: 'line1' },
      { addressLine2: 'line2' },
      { city: 'City' },
      { state: 'State' },
      { postalCode: '12345' },
      { country: 'Country' },
      { lat: 1 },
      { lng: 2 },
    ];

    for (const payload of payloads) {
      await repo.update('p1', payload as any);
    }

    expect(tx.update).toHaveBeenCalled();
  });

  it('updates individual profile fields without touching people data', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn(() => makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const payloads = [
      { dob: '2024-01-01' },
      { gender: 'F' },
      { learningGoal: 'Goal' },
      { intendedSubject: 'Math' },
      { leadId: 'lead-1' },
    ];

    for (const payload of payloads) {
      await repo.update('p1', payload as any);
    }

    expect(tx.update).toHaveBeenCalled();
  });

  it('soft deletes a student', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.softDelete('p1');
    expect(result?.personId).toBe('p1');
  });

  it('hard deletes a student', async () => {
    const tx = {
      delete: jest
        .fn()
        .mockReturnValueOnce(makeDeleteQuery([]))
        .mockReturnValueOnce(makeDeleteQuery([{ id: 'p1' }])),
    } as any;
    const db = {
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    await expect(repo.hardDelete('p1')).resolves.toBe(true);
  });

  it('restores a student', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.restore('p1');
    expect(result?.personId).toBe('p1');
  });
});

describe('StudentsService', () => {
  const adminSession = { user: { id: 'admin', emailVerified: true } } as any;
  const studentSession = {
    user: { id: 's1', emailVerified: true, personId: 'p1' },
  } as any;

  it('rejects when session is missing', async () => {
    const repo = { findById: jest.fn() } as any;
    const rbac = { getUserScopeRoles: jest.fn() } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getOne(null, 'p1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requires admin to create', async () => {
    const repo = { create: jest.fn() } as any;
    const rbac = {
      requireRole: jest.fn().mockRejectedValue(new ForbiddenException()),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, {} as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates required names', async () => {
    const repo = { create: jest.fn() } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, { firstName: '', lastName: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps EMAIL_EXISTS to conflict', async () => {
    const repo = {
      create: jest.fn().mockRejectedValue(new Error('EMAIL_EXISTS')),
    } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, {
        firstName: 'Ada',
        lastName: 'Lovelace',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows create errors', async () => {
    const repo = {
      create: jest.fn().mockRejectedValue(new Error('boom')),
    } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.createOne(adminSession, {
        firstName: 'Ada',
        lastName: 'Lovelace',
      } as any),
    ).rejects.toThrow('boom');
  });

  it('returns all students', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([]) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getAll(adminSession, true)).resolves.toEqual([]);
  });

  it('defaults includeDeleted to false', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([]) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await service.getAll(adminSession);
    expect(repo.findAll).toHaveBeenCalledWith(false);
  });

  it('allows student to read self', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ personId: 'p1' }),
    } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['STUDENT'])),
      requireRole: jest.fn(),
    } as any;
    const service = new StudentsService(repo, rbac);

    const result = await service.getOne(studentSession, 'p1');
    expect(result).toEqual({ personId: 'p1' });
  });

  it('rejects when student is not self', async () => {
    const repo = { findById: jest.fn() } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['STUDENT'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.getOne(studentSession, 'p2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when student not found', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.getOne(adminSession, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects empty name update', async () => {
    const repo = { update: jest.fn() } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: '' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps update EMAIL_EXISTS to conflict', async () => {
    const repo = {
      update: jest.fn().mockRejectedValue(new Error('EMAIL_EXISTS')),
    } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { email: 'a@example.com' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows update errors', async () => {
    const repo = {
      update: jest.fn().mockRejectedValue(new Error('boom')),
    } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).rejects.toThrow('boom');
  });

  it('throws when update returns undefined', async () => {
    const repo = { update: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a student', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue({ personId: 'p1' }),
    } as any;
    const rbac = {
      getUserScopeRoles: jest.fn().mockResolvedValue(new Set(['ADMIN'])),
    } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.updateOne(adminSession, 'p1', { firstName: 'Ada' } as any),
    ).resolves.toEqual({ personId: 'p1' });
  });

  it('rejects delete when not found', async () => {
    const repo = { softDelete: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects hard delete when not found', async () => {
    const repo = { hardDelete: jest.fn().mockResolvedValue(false) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(
      service.deleteOne(adminSession, 'p1', true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft deletes student', async () => {
    const repo = {
      softDelete: jest.fn().mockResolvedValue({ personId: 'p1' }),
    } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1')).resolves.toEqual({
      removed: true,
      hardDelete: false,
    });
  });

  it('hard deletes student', async () => {
    const repo = { hardDelete: jest.fn().mockResolvedValue(true) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.deleteOne(adminSession, 'p1', true)).resolves.toEqual({
      removed: true,
      hardDelete: true,
    });
  });

  it('restores a student', async () => {
    const repo = {
      restore: jest.fn().mockResolvedValue({ personId: 'p1' }),
    } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.restoreOne(adminSession, 'p1')).resolves.toEqual({
      personId: 'p1',
    });
  });

  it('throws when restore misses', async () => {
    const repo = { restore: jest.fn().mockResolvedValue(undefined) } as any;
    const rbac = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const service = new StudentsService(repo, rbac);

    await expect(service.restoreOne(adminSession, 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('students.types', () => {
  it('normalizes email values', () => {
    const created = createStudentSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '',
    });
    expect(created.email).toBeNull();

    const updated = updateStudentSchema.parse({
      email: 'user@example.com',
    });
    expect(updated.email).toBe('user@example.com');
  });
});
