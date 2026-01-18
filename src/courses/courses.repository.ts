import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { courseTeachers, courses } from '@/db/schema';
import type {
  CourseFilterInput,
  CreateCourseInput,
  UpdateCourseInput,
} from '@/courses/courses.types';

@Injectable()
export class CoursesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(payload: CreateCourseInput, orgId: string) {
    const [row] = await this.db
      .insert(courses)
      .values({
        id: nanoid(10),
        name: payload.name,
        difficulty: payload.difficulty ?? 'FOUNDATION',
        description: payload.description ?? null,
        instrumentId: payload.instrumentId ?? null,
        orgId,
      })
      .returning();

    return row;
  }

  async update(id: string, orgId: string, payload: UpdateCourseInput) {
    const [row] = await this.db
      .update(courses)
      .set({
        name: payload.name,
        difficulty: payload.difficulty,
        description: payload.description ?? null,
        instrumentId: payload.instrumentId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, id), eq(courses.orgId, orgId)))
      .returning();

    return row;
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.db
      .select()
      .from(courses)
      .where(and(eq(courses.id, id), eq(courses.orgId, orgId)))
      .limit(1);
    return row;
  }

  async findAll(filter: CourseFilterInput, orgId: string) {
    const conditions = [eq(courses.orgId, orgId)];

    if (!filter.includeDeleted) {
      conditions.push(eq(courses.isDeleted, false));
    }

    if (filter.search) {
      conditions.push(ilike(courses.name, `%${filter.search}%`));
    }

    if (filter.difficulty) {
      conditions.push(eq(courses.difficulty, filter.difficulty));
    }

    return this.db
      .select()
      .from(courses)
      .where(and(...conditions));
  }

  async getTeacherIds(courseId: string) {
    const rows = await this.db
      .select({ teacherPersonId: courseTeachers.teacherPersonId })
      .from(courseTeachers)
      .where(eq(courseTeachers.courseId, courseId));
    return rows.map((row) => row.teacherPersonId);
  }

  async setTeachers(courseId: string, teacherIds: string[]) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(courseTeachers)
        .where(eq(courseTeachers.courseId, courseId));
      if (teacherIds.length > 0) {
        await tx.insert(courseTeachers).values(
          teacherIds.map((teacherId) => ({
            courseId,
            teacherPersonId: teacherId,
          })),
        );
      }
    });
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.db
      .update(courses)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, id), eq(courses.orgId, orgId)))
      .returning();

    return row ? true : false;
  }

  async restore(id: string, orgId: string) {
    const [row] = await this.db
      .update(courses)
      .set({
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, id), eq(courses.orgId, orgId)))
      .returning();

    return row ? true : false;
  }

  async hardDelete(id: string, orgId: string) {
    const [row] = await this.db
      .delete(courses)
      .where(and(eq(courses.id, id), eq(courses.orgId, orgId)))
      .returning();

    return row ? true : false;
  }
}
