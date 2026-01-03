import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacService } from '@/rbac/rbac.service';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';

@Module({
  imports: [AuthModule, DatabaseModule],
  providers: [RbacService, RolesGuard, VerifiedUserGuard],
  exports: [RbacService, RolesGuard, VerifiedUserGuard],
})
export class RbacModule {}
