import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from '@/admin/admin.service';

function makeSelectChain(result: unknown[]) {
  const chain: any = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(result);
  return chain;
}

function makeTx() {
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
}

describe('AdminService', () => {
  const session = { user: { id: 'actor', emailVerified: true } } as any;
  const personRow = {
    id: 'person-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    isDeleted: false,
  } as any;

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
