import { AuthController } from '@/auth/auth.controller';

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
