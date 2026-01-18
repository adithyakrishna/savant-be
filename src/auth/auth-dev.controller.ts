import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { getVerificationToken } from '@/auth/verification-token.store';

@ApiTags('Auth Dev')
@Controller('auth-dev')
export class AuthDevController {
  @Get('verification-code')
  @ApiOperation({ summary: 'Fetch verification code by email (dev only)' })
  @ApiQuery({ name: 'email', required: true, description: 'User email' })
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
