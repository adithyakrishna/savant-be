import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRepository } from '@/staff/staff.repository';
import type { AuthSession } from '@/auth/auth.service';
import { RbacService } from '@/rbac/rbac.service';
import type {
  Course,
  CourseFilterInput,
  CreateCourseInput,
  UpdateCourseInput,
} from '@/courses/courses.types';
import { CoursesRepository } from '@/courses/courses.repository';

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly staffRepository: StaffRepository,
    private readonly rbacService: RbacService,
  ) {}

  private async requireAdmin(session: AuthSession) {
    await this.rbacService.requireRole(session, ['SUPER_ADMIN', 'ADMIN']);
  }

  async listAll(
    session: AuthSession,
    filter: CourseFilterInput,
    orgId: string,
  ): Promise<Course[]> {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const rows = await this.coursesRepository.findAll(filter, orgId);
    const teacherMap = new Map<string, string[]>();

    await Promise.all(
      rows.map(async (row) => {
        const teachers = await this.coursesRepository.getTeacherIds(row.id);
        teacherMap.set(row.id, teachers);
      }),
    );

    return rows.map((row) => ({
      ...row,
      teacherIds: teacherMap.get(row.id) ?? [],
    }));
  }

  async getOne(
    session: AuthSession,
    courseId: string,
    orgId: string,
  ): Promise<Course> {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const course = await this.coursesRepository.findById(courseId, orgId);
    if (!course || course.isDeleted) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const teacherIds = await this.coursesRepository.getTeacherIds(courseId);
    return { ...course, teacherIds };
  }

  async createOne(
    session: AuthSession,
    payload: CreateCourseInput,
    orgId: string,
  ): Promise<Course> {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const teacherIds = payload.teacherIds ?? [];
    if (teacherIds.length) {
      await this.ensureTeachersInOrg(teacherIds, orgId);
    }

    const course = await this.coursesRepository.create(payload, orgId);

    if (teacherIds.length) {
      await this.coursesRepository.setTeachers(course.id, teacherIds);
    }

    return {
      ...course,
      teacherIds,
    };
  }

  async updateOne(
    session: AuthSession,
    courseId: string,
    payload: UpdateCourseInput,
    orgId: string,
  ): Promise<Course> {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const teacherIds = payload.teacherIds;
    if (teacherIds) {
      await this.ensureTeachersInOrg(teacherIds, orgId);
    }

    const updated = await this.coursesRepository.update(
      courseId,
      orgId,
      payload,
    );
    if (!updated || updated.isDeleted) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    if (teacherIds) {
      await this.coursesRepository.setTeachers(courseId, teacherIds);
    }

    const currentTeachers =
      await this.coursesRepository.getTeacherIds(courseId);
    return { ...updated, teacherIds: currentTeachers };
  }

  async assignTeachers(
    session: AuthSession,
    courseId: string,
    teacherIds: string[],
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    await this.ensureTeachersInOrg(teacherIds, orgId);

    const course = await this.coursesRepository.findById(courseId, orgId);
    if (!course || course.isDeleted) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    await this.coursesRepository.setTeachers(courseId, teacherIds);
    const currentTeachers =
      await this.coursesRepository.getTeacherIds(courseId);
    return { ...course, teacherIds: currentTeachers };
  }

  async deleteOne(
    session: AuthSession,
    courseId: string,
    hardDelete: boolean,
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const removed = hardDelete
      ? await this.coursesRepository.hardDelete(courseId, orgId)
      : await this.coursesRepository.softDelete(courseId, orgId);

    if (!removed) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    return { removed: true, hardDelete };
  }

  async restoreOne(session: AuthSession, courseId: string, orgId: string) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const restored = await this.coursesRepository.restore(courseId, orgId);
    if (!restored) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    return { restored: true };
  }

  private async ensureTeachersInOrg(teacherIds: string[], orgId: string) {
    const validIds = await this.staffRepository.getTeacherIdsInOrg(
      teacherIds,
      orgId,
    );

    if (validIds.length !== teacherIds.length) {
      throw new BadRequestException('One or more teacherIds are invalid');
    }
  }
}
