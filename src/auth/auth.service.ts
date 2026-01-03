import { Inject, Injectable } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Request } from 'express';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { storeVerificationToken } from '@/auth/verification-token.store';

export type AuthSession = {
  session: {
    userId: string;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    personId?: string | null;
  };
} | null;

export const handlerFactory = {
  async create(auth: Auth) {
    const { toNodeHandler } = await import('better-auth/node');
    return toNodeHandler(auth);
  },
};

export const verificationTokenFactory = {
  async create(secret: string, email: string, expiresIn?: number) {
    const { createEmailVerificationToken } = await import('better-auth/api');
    return createEmailVerificationToken(secret, email, undefined, expiresIn);
  },
};

@Injectable()
export class AuthService {
  private handler?: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  private async getHandler(): Promise<
    (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
  > {
    if (!this.handler) {
      this.handler = await handlerFactory.create(this.auth);
    }
    return this.handler;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const handler = await this.getHandler();
    await handler(req, res);
  }

  async getSession(req: Request): Promise<AuthSession> {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        headers.set(key, value.join(','));
      } else if (value) {
        headers.set(key, value);
      }
    }
    return this.auth.api.getSession({
      headers,
      asResponse: false,
      returnHeaders: false,
    }) as Promise<AuthSession>;
  }

  async createEmailPasswordUser(payload: {
    name: string;
    email: string;
    password: string;
    image?: string | null;
    emailVerified?: boolean;
  }) {
    const ctx = await this.auth.$context;
    const normalizedEmail = payload.email.trim().toLowerCase();
    const hash = await ctx.password.hash(payload.password);
    const createdUser = await ctx.internalAdapter.createUser({
      email: normalizedEmail,
      name: payload.name,
      image: payload.image ?? undefined,
      emailVerified: payload.emailVerified ?? false,
    });
    if (!createdUser) {
      return null;
    }
    await ctx.internalAdapter.linkAccount({
      userId: createdUser.id,
      providerId: 'credential',
      accountId: createdUser.id,
      password: hash,
    });
    return createdUser;
  }

  async issueEmailVerificationToken(payload: { email: string }) {
    const ctx = await this.auth.$context;
    const token = await verificationTokenFactory.create(
      ctx.secret,
      payload.email,
      ctx.options.emailVerification?.expiresIn,
    );
    storeVerificationToken(payload.email, token);
    return token;
  }

  async requestPasswordReset(payload: { email: string; redirectTo?: string }) {
    return this.auth.api.requestPasswordReset({
      body: payload,
      headers: new Headers(),
    });
  }
}
