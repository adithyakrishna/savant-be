import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { StaffModule } from '@/staff/staff.module';
import { CoursesController } from '@/courses/courses.controller';
import { CoursesRepository } from '@/courses/courses.repository';
import { CoursesService } from '@/courses/courses.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule, StaffModule],
  controllers: [CoursesController],
  providers: [CoursesService, CoursesRepository],
})
export class CoursesModule {}
