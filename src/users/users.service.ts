import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, User } from './users.types';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createOne(payload: CreateUserDto): Promise<User> {
    if (!payload?.name) {
      throw new BadRequestException('Name is required');
    }

    try {
      return await this.usersRepository.create(payload);
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async getAll(includeDeleted = false): Promise<User[]> {
    return this.usersRepository.findAll(includeDeleted);
  }

  async getOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async updateOne(id: string, payload: UpdateUserDto): Promise<User> {
    if (payload?.name === '') {
      throw new BadRequestException('Name cannot be empty');
    }

    const updated = await this.usersRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return updated;
  }

  async deleteOne(
    id: string,
    hardDelete = false,
  ): Promise<{ removed: boolean; hardDelete: boolean }> {
    if (hardDelete) {
      const removed = await this.usersRepository.hardDelete(id);
      if (!removed) {
        throw new NotFoundException(`User ${id} not found`);
      }
      return { removed: true, hardDelete: true };
    }

    const removed = await this.usersRepository.softDelete(id);
    if (!removed) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return { removed: true, hardDelete: false };
  }
}
