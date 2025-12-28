import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { UsersService } from '@/users/users.service';
import type { CreateUserDto, UpdateUserDto } from '@/users/users.types';
import { createUserSchema, updateUserSchema } from '@/users/users.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@Query('includeDeleted') includeDeleted?: string) {
    return this.usersService.getAll(includeDeleted === 'true');
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getOne(id);
  }

  @Post()
  createUser(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto) {
    return this.usersService.createOne(body);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ) {
    return this.usersService.updateOne(id, body);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string, @Query('hard') hard?: string) {
    const doHardDelete = hard === 'true';
    return this.usersService.deleteOne(id, doHardDelete);
  }
}
