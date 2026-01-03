import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { AdminController } from '@/admin/admin.controller';
import { AdminService } from '@/admin/admin.service';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
