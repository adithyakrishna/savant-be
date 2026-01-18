import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { InstrumentsController } from '@/instruments/instruments.controller';
import { InstrumentsRepository } from '@/instruments/instruments.repository';
import { InstrumentsService } from '@/instruments/instruments.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [InstrumentsController],
  providers: [InstrumentsService, InstrumentsRepository],
})
export class InstrumentsModule {}
