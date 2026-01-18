import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/db/db.module';
import { RbacModule } from '@/rbac/rbac.module';
import { OrgController } from '@/org/org.controller';
import { OrgRepository } from '@/org/org.repository';
import { OrgService } from '@/org/org.service';

@Module({
  imports: [AuthModule, DatabaseModule, RbacModule],
  controllers: [OrgController],
  providers: [OrgService, OrgRepository],
  exports: [OrgService],
})
export class OrgModule {}
