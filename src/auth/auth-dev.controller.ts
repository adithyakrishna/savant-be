import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { getVerificationToken } from '@/auth/verification-token.store';

@Controller('auth-dev')
export class AuthDevController {
  @Get('verification-code')
  getVerificationCode(@Query('email') email?: string) {
    if (!email) {
      throw new BadRequestException('email is required');
    }

    const entry = getVerificationToken(email);
    if (!entry) {
      throw new NotFoundException('verification code not found');
    }

    return {
      email: email.trim().toLowerCase(),
      token: entry.token,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
