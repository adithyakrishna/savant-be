import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { AdminService } from '@/admin/admin.service';
import type { ProvisionUserDto } from '@/admin/admin.types';
import { provisionUserSchema } from '@/admin/admin.types';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';

type RequestWithSession = Request & { authSession?: AuthSession };

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('provision-user')
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  async provisionUser(
    @Req() req: Request,
    @Body(new ZodValidationPipe(provisionUserSchema)) body: ProvisionUserDto,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.adminService.provisionUser(actorSession ?? null, body);
  }

}
