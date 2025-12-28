import { Inject, Injectable } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { IncomingMessage, ServerResponse } from 'http';
import { AUTH_INSTANCE } from '@/auth/auth.constants';

@Injectable()
export class AuthService {
  private handler?: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  private async getHandler(): Promise<
    (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
  > {
    if (!this.handler) {
      const { toNodeHandler } = await import('better-auth/node');
      this.handler = toNodeHandler(this.auth);
    }
    return this.handler;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const handler = await this.getHandler();
    await handler(req, res);
  }
}
