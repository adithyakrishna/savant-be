import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import { RBAC_ROLES_KEY, RBAC_SCOPE_KEY } from '@/rbac/rbac.decorators';

function makeContext(req: any) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('Rbac guards', () => {
  it('VerifiedUserGuard rejects unauthenticated', async () => {
    const authService = { getSession: jest.fn().mockResolvedValue(null) } as any;
    const rbacService = { requireVerifiedUser: jest.fn() } as any;
    const guard = new VerifiedUserGuard(authService, rbacService);

    await expect(guard.canActivate(makeContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('VerifiedUserGuard sets session on request', async () => {
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const authService = { getSession: jest.fn().mockResolvedValue(session) } as any;
    const rbacService = { requireVerifiedUser: jest.fn() } as any;
    const guard = new VerifiedUserGuard(authService, rbacService);
    const req: any = {};

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.authSession).toBe(session);
  });

  it('RolesGuard allows when no roles are required', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(undefined as any);
    const guard = new RolesGuard({} as any, {} as any, reflector);

    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
  });

  it('RolesGuard uses session from request', async () => {
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(undefined as any);

    const authService = { getSession: jest.fn() } as any;
    const rbacService = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const guard = new RolesGuard(authService, rbacService, reflector);
    const req: any = { authSession: session };

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(authService.getSession).not.toHaveBeenCalled();
    expect(rbacService.requireRole).toHaveBeenCalledWith(session, ['ADMIN'], 'GLOBAL');
  });

  it('RolesGuard pulls scope metadata', async () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce('SCOPE');

    const authService = { getSession: jest.fn().mockResolvedValue({ user: { id: 'u1', emailVerified: true } }) } as any;
    const rbacService = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
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
    const session = { user: { id: 'u1', emailVerified: true } } as any;
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(undefined as any);

    const authService = { getSession: jest.fn().mockResolvedValue(session) } as any;
    const rbacService = { requireRole: jest.fn().mockResolvedValue(new Set()) } as any;
    const guard = new RolesGuard(authService, rbacService, reflector);
    const req: any = {};

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(authService.getSession).toHaveBeenCalled();
    expect(req.authSession).toBe(session);
  });
});
