import { PassThrough } from 'stream';
import type { IncomingMessage } from 'http';
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('main', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.BETTER_AUTH_BASE_PATH = '/auth';
  });

  it('detects json content', async () => {
    const { hasJsonContent } = await import('@/main');
    const req = { headers: { 'content-type': 'application/json; charset=utf-8' } } as IncomingMessage;
    expect(hasJsonContent(req)).toBe(true);
  });

  it('returns false for missing json content', async () => {
    const { hasJsonContent } = await import('@/main');
    const req = { headers: {} } as IncomingMessage;
    expect(hasJsonContent(req)).toBe(false);
  });

  it('falls back to default auth base path when env is unset', async () => {
    jest.resetModules();
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
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const middleware = app.use.mock.calls[0][0];
    const next = jest.fn();
    await middleware({ url: '/auth/session', method: 'POST', headers: {} }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('parses json body and assigns req.body', async () => {
    const { NestFactory } = await import('@nestjs/core');
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
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
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    const main = await import('@/main');

    await main.bootstrap();

    const next = jest.fn();
    await app.use.mock.calls[0][0](
      { url: '/students', method: 'GET', headers: { 'content-type': 'application/json' } },
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
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
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
    req.headers = { 'content-type': 'application/json' } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from('{"ok":true}'));
    req.emit('end');

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('returns undefined when body is empty', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = { 'content-type': 'application/json' } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
  });

  it('returns undefined for empty json payload', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = { 'content-type': 'application/json' } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from(''));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects invalid json', async () => {
    const { readJsonBody } = await import('@/main');
    const req = new PassThrough() as IncomingMessage;
    req.headers = { 'content-type': 'application/json' } as IncomingMessage['headers'];

    const promise = readJsonBody(req);
    req.emit('data', Buffer.from('{bad json}'));
    req.emit('end');

    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it('auto-bootstraps when not in test env', async () => {
    process.env.NODE_ENV = 'production';
    const { NestFactory } = await import('@nestjs/core');
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    await import('@/main');
    await new Promise((resolve) => setImmediate(resolve));

    expect(NestFactory.create).toHaveBeenCalled();
  });

  it('uses PORT when provided', async () => {
    process.env.PORT = '4000';
    const { NestFactory } = await import('@nestjs/core');
    const app = { use: jest.fn(), listen: jest.fn().mockResolvedValue(undefined) };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    const main = await import('@/main');
    await main.bootstrap();

    expect(app.listen).toHaveBeenCalledWith('4000');
  });
});
