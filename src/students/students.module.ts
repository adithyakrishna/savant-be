import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { StudentsController } from '@/students/students.controller';
import { StudentsRepository } from '@/students/students.repository';
import { StudentsService } from '@/students/students.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService],
})
export class StudentsModule {}
