import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { StaffController } from '@/staff/staff.controller';
import { StaffRepository } from '@/staff/staff.repository';
import { StaffService } from '@/staff/staff.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
