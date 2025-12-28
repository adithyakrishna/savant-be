import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';

@Injectable()
export class AuthConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get betterAuth() {
    return {
      baseUrl: this.configService.get('BETTER_AUTH_BASE_URL', { infer: true }),
      secret: this.configService.get('BETTER_AUTH_SECRET', { infer: true }),
      issuer: this.configService.get('BETTER_AUTH_ISSUER', { infer: true }),
      audience: this.configService.get('BETTER_AUTH_AUDIENCE', { infer: true }),
    };
  }
}
