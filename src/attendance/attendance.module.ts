import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { AttendanceController } from '@/attendance/attendance.controller';
import { AttendanceRepository } from '@/attendance/attendance.repository';
import { AttendanceService } from '@/attendance/attendance.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService],
})
export class AttendanceModule {}
