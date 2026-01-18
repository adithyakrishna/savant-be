import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { AdminModule } from '@/admin/admin.module';
import { validateEnv } from '@/config/env';
import { DatabaseModule } from '@/db/db.module';
import { StudentsModule } from '@/students/students.module';
import { OrgModule } from '@/org/org.module';
import { AttendanceModule } from '@/attendance/attendance.module';
import { StaffModule } from '@/staff/staff.module';
import { InstrumentsModule } from '@/instruments/instruments.module';
import { CoursesModule } from '@/courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    AdminModule,
    StudentsModule,
    OrgModule,
    AttendanceModule,
    StaffModule,
    InstrumentsModule,
    CoursesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
