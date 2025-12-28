import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthConfigService } from './auth.service';

@Module({
  imports: [ConfigModule],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthModule {}
