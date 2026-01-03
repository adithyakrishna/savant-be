import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { RbacService } from '@/rbac/rbac.service';

function makeSelectChain(result: unknown[]) {
  const chain: any = {};
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockResolvedValue(result);
  return chain;
}

describe('RbacService', () => {
  it('returns user scope roles', async () => {
    const db = { select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'ADMIN' }])) } as any;
    const service = new RbacService(db);

    const roles = await service.getUserScopeRoles('user-1');
    expect(roles.has('ADMIN')).toBe(true);
  });

  it('requires verified users', () => {
    const service = new RbacService({} as any);
    expect(() => service.requireVerifiedUser(null)).toThrow(UnauthorizedException);
    expect(() =>
      service.requireVerifiedUser({ user: { emailVerified: false } } as any),
    ).toThrow(ForbiddenException);
  });

  it('requires a role', async () => {
    const db = { select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'ADMIN' }])) } as any;
    const service = new RbacService(db);
    const session = { user: { id: 'u1', emailVerified: true } } as any;

    const roles = await service.requireRole(session, ['ADMIN']);
    expect(roles.has('ADMIN')).toBe(true);
  });

  it('rejects missing roles', async () => {
    const db = { select: jest.fn().mockReturnValue(makeSelectChain([{ role: 'STUDENT' }])) } as any;
    const service = new RbacService(db);
    const session = { user: { id: 'u1', emailVerified: true } } as any;

    await expect(service.requireRole(session, ['ADMIN'])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('checks provisioning rules', () => {
    const service = new RbacService({} as any);
    expect(service.canProvisionRole(new Set(['SUPER_ADMIN']), 'ADMIN')).toBe(true);
    expect(service.canProvisionRole(new Set(['ADMIN']), 'SUPER_ADMIN')).toBe(false);
    expect(service.canProvisionRole(new Set(['ADMIN']), 'STAFF')).toBe(true);
    expect(service.canProvisionRole(new Set(['STUDENT']), 'ADMIN')).toBe(false);
  });
});
