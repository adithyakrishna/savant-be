import { AuthService, handlerFactory, verificationTokenFactory } from '@/auth/auth.service';
import { storeVerificationToken } from '@/auth/verification-token.store';

const toNodeHandler = jest.fn(() => jest.fn());
const createEmailVerificationToken = jest.fn(() => 'token-raw');

jest.mock('better-auth/node', () => ({
  toNodeHandler,
}));

jest.mock('better-auth/api', () => ({
  createEmailVerificationToken,
}));

jest.mock('@/auth/verification-token.store', () => ({
  storeVerificationToken: jest.fn(),
}));

describe('AuthService', () => {
  const originalHandlerFactory = handlerFactory.create;
  const originalVerificationFactory = verificationTokenFactory.create;
  const handler = jest.fn();
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

  beforeEach(() => {
    jest.clearAllMocks();
    handlerFactory.create = originalHandlerFactory;
    verificationTokenFactory.create = originalVerificationFactory;
  });

  it('memoizes the node handler', async () => {
    const service = new AuthService(auth);
    const req: any = {};
    const res: any = {};

    handlerFactory.create = jest.fn().mockResolvedValue(handler);

    await service.handle(req, res);
    await service.handle(req, res);

    expect(handlerFactory.create).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('maps request headers to getSession', async () => {
    auth.api.getSession.mockResolvedValue({ user: { id: 'u1', emailVerified: true } });
    const service = new AuthService(auth);

    const session = await service.getSession({
      headers: { authorization: 'Bearer x', accept: ['a', 'b'] },
    } as any);

    expect(auth.api.getSession).toHaveBeenCalled();
    expect(session).toEqual({ user: { id: 'u1', emailVerified: true } });
  });

  it('ignores falsy header values', async () => {
    auth.api.getSession.mockResolvedValue({ user: { id: 'u1', emailVerified: true } });
    const service = new AuthService(auth);

    await service.getSession({
      headers: { authorization: '', 'x-empty': undefined },
    } as any);

    expect(auth.api.getSession).toHaveBeenCalled();
  });

  it('creates an email/password user', async () => {
    const ctx = await auth.$context;
    ctx.internalAdapter.createUser.mockResolvedValue({ id: 'u1' });
    const service = new AuthService(auth);

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
    const service = new AuthService(auth);

    await expect(
      service.createEmailPasswordUser({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret',
      }),
    ).resolves.toBeNull();
  });

  it('issues verification tokens', async () => {
    const service = new AuthService(auth);
    verificationTokenFactory.create = jest.fn().mockResolvedValue('token-123');

    await expect(
      service.issueEmailVerificationToken({ email: 'user@example.com' }),
    ).resolves.toBe('token-123');

    expect(storeVerificationToken).toHaveBeenCalledWith('user@example.com', 'token-123');
  });

  it('requests password reset', async () => {
    const service = new AuthService(auth);
    auth.api.requestPasswordReset.mockResolvedValue({ ok: true });

    const result = await service.requestPasswordReset({ email: 'user@example.com' });
    expect(result).toEqual({ ok: true });
  });

  it('creates handler via factory', async () => {
    const handler = await handlerFactory.create(auth);
    expect(handler).toBeInstanceOf(Function);
  });

  it('creates verification token via factory', async () => {
    const token = await verificationTokenFactory.create('secret', 'user@example.com', 3600);
    expect(typeof token).toBe('string');
  });
});
