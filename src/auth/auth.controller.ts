import { Controller, Req, Res, All } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '@/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.authService.handle(req, res);
  }
}
