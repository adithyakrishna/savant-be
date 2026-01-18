import { Controller, Req, Res, All } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/auth/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  @ApiOperation({ summary: 'Proxy Better Auth endpoints' })
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authService.handle(req, res);
  }
}
