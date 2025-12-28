import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/db/db.module';
import { UsersController } from '@/users/users.controller';
import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
