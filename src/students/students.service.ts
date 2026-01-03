import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthSession } from '@/auth/auth.service';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';
import { RbacService } from '@/rbac/rbac.service';
import type { CreateStudentDto, Student, UpdateStudentDto } from '@/students/students.types';
import { StudentsRepository } from '@/students/students.repository';

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly rbacService: RbacService,
  ) {}

  private async requireAdmin(session: AuthSession) {
    await this.rbacService.requireRole(session, ['SUPER_ADMIN', 'ADMIN']);
  }

  private async requireAdminOrSelf(session: AuthSession, personId: string) {
    if (!session?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const roles = await this.rbacService.getUserScopeRoles(
      session.user.id,
      DEFAULT_SCOPE_ID,
    );

    if (roles.has('SUPER_ADMIN') || roles.has('ADMIN')) {
      return;
    }

    if (
      roles.has('STUDENT') &&
      session.user.personId &&
      session.user.personId === personId
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient privileges');
  }

  async createOne(session: AuthSession, payload: CreateStudentDto): Promise<Student> {
    await this.requireAdmin(session);

    if (!payload?.firstName || !payload?.lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    try {
      return await this.studentsRepository.create(payload);
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async getAll(session: AuthSession, includeDeleted = false): Promise<Student[]> {
    await this.requireAdmin(session);
    return this.studentsRepository.findAll(includeDeleted);
  }

  async getOne(session: AuthSession, personId: string): Promise<Student> {
    await this.requireAdminOrSelf(session, personId);
    const student = await this.studentsRepository.findById(personId);
    if (!student) {
      throw new NotFoundException(`Student ${personId} not found`);
    }
    return student;
  }

  async updateOne(
    session: AuthSession,
    personId: string,
    payload: UpdateStudentDto,
  ): Promise<Student> {
    await this.requireAdminOrSelf(session, personId);

    if (payload?.firstName === '' || payload?.lastName === '') {
      throw new BadRequestException('Name cannot be empty');
    }

    try {
      const updated = await this.studentsRepository.update(personId, payload);
      if (!updated) {
        throw new NotFoundException(`Student ${personId} not found`);
      }
      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async deleteOne(
    session: AuthSession,
    personId: string,
    hardDelete = false,
  ): Promise<{ removed: boolean; hardDelete: boolean }> {
    await this.requireAdmin(session);

    if (hardDelete) {
      const removed = await this.studentsRepository.hardDelete(personId);
      if (!removed) {
        throw new NotFoundException(`Student ${personId} not found`);
      }
      return { removed: true, hardDelete: true };
    }

    const removed = await this.studentsRepository.softDelete(personId);
    if (!removed) {
      throw new NotFoundException(`Student ${personId} not found`);
    }
    return { removed: true, hardDelete: false };
  }

  async restoreOne(session: AuthSession, personId: string): Promise<Student> {
    await this.requireAdmin(session);
    const restored = await this.studentsRepository.restore(personId);
    if (!restored) {
      throw new NotFoundException(`Student ${personId} not found`);
    }
    return restored;
  }
}
