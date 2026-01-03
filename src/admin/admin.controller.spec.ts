import { AdminController } from '@/admin/admin.controller';

describe('AdminController', () => {
  it('passes session and body to service', async () => {
    const adminService = { provisionUser: jest.fn().mockResolvedValue({}) } as any;
    const controller = new AdminController(adminService);
    const req = { authSession: { user: { id: 'u1' } } } as any;

    await controller.provisionUser(req, { role: 'ADMIN', personId: 'p1' } as any);

    expect(adminService.provisionUser).toHaveBeenCalledWith(req.authSession, {
      role: 'ADMIN',
      personId: 'p1',
    });
  });

  it('falls back to null session when missing', async () => {
    const adminService = { provisionUser: jest.fn().mockResolvedValue({}) } as any;
    const controller = new AdminController(adminService);
    const req = {} as any;

    await controller.provisionUser(req, { role: 'ADMIN', personId: 'p1' } as any);

    expect(adminService.provisionUser).toHaveBeenCalledWith(null, {
      role: 'ADMIN',
      personId: 'p1',
    });
  });
});
