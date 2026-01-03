import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { people, studentProfiles, user } from '@/db/schema';
import type {
  CreateStudentDto,
  Student,
  UpdateStudentDto,
} from '@/students/students.types';

const emailVerifiedExpression = sql<boolean>`
  coalesce(${user.emailVerified}, false)
`;

type StudentRow = Student & { emailVerified?: boolean | null };

function normalizeEmailVerified(row: StudentRow): Student {
  return {
    ...row,
    emailVerified: Boolean(row.emailVerified),
  };
}

function normalizeStudentRow(row?: StudentRow): Student | undefined {
  if (!row) {
    return undefined;
  }
  return normalizeEmailVerified(row);
}

@Injectable()
export class StudentsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  private normalizeEmail(email?: string | null): string | null {
    if (email === undefined || email === null) {
      return null;
    }

    const trimmed = email.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isEmailUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybe = error as { code?: string; constraint?: string };
    return maybe.code === '23505' && maybe.constraint === 'people_email_unique';
  }

  async create(payload: CreateStudentDto): Promise<Student> {
    const normalizedEmail = this.normalizeEmail(payload.email);

    if (normalizedEmail) {
      const [existing] = await this.db
        .select({ id: people.id })
        .from(people)
        .where(and(eq(people.email, normalizedEmail), eq(people.isDeleted, false)))
        .limit(1);

      if (existing) {
        throw new Error('EMAIL_EXISTS');
      }
    }

    const personId = randomUUID();
    const {
      firstName,
      lastName,
      phone,
      avatar,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      lat,
      lng,
      dob,
      gender,
      learningGoal,
      intendedSubject,
      leadId,
    } = payload;

    try {
      return await this.db.transaction(async (tx) => {
        const [person] = await tx
          .insert(people)
          .values({
            id: personId,
            firstName,
            lastName,
            email: normalizedEmail,
            phone,
            avatar,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            lat,
            lng,
          })
          .returning();

        const [profile] = await tx
          .insert(studentProfiles)
          .values({
            personId,
            dob,
            gender,
            learningGoal,
            intendedSubject,
            leadId,
          })
          .returning();

        return {
          personId: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          emailVerified: false,
          phone: person.phone,
          avatar: person.avatar,
          addressLine1: person.addressLine1,
          addressLine2: person.addressLine2,
          city: person.city,
          state: person.state,
          postalCode: person.postalCode,
          country: person.country,
          lat: person.lat,
          lng: person.lng,
          dob: profile.dob,
          gender: profile.gender,
          learningGoal: profile.learningGoal,
          intendedSubject: profile.intendedSubject,
          leadId: profile.leadId,
          isDeleted: profile.isDeleted,
          deletedAt: profile.deletedAt,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        };
      });
    } catch (error) {
      if (this.isEmailUniqueViolation(error)) {
        throw new Error('EMAIL_EXISTS');
      }
      throw error;
    }
  }

  async findAll(includeDeleted: boolean): Promise<Student[]> {
    const baseQuery = this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        emailVerified: emailVerifiedExpression,
        phone: people.phone,
        avatar: people.avatar,
        addressLine1: people.addressLine1,
        addressLine2: people.addressLine2,
        city: people.city,
        state: people.state,
        postalCode: people.postalCode,
        country: people.country,
        lat: people.lat,
        lng: people.lng,
        dob: studentProfiles.dob,
        gender: studentProfiles.gender,
        learningGoal: studentProfiles.learningGoal,
        intendedSubject: studentProfiles.intendedSubject,
        leadId: studentProfiles.leadId,
        isDeleted: studentProfiles.isDeleted,
        deletedAt: studentProfiles.deletedAt,
        createdAt: studentProfiles.createdAt,
        updatedAt: studentProfiles.updatedAt,
      })
      .from(studentProfiles)
      .innerJoin(people, eq(studentProfiles.personId, people.id))
      .leftJoin(user, eq(user.personId, people.id));

    const resultQuery = includeDeleted
      ? baseQuery
      : baseQuery.where(
          and(eq(studentProfiles.isDeleted, false), eq(people.isDeleted, false)),
        );

    const rows = await resultQuery;
    return rows.map(normalizeEmailVerified);
  }

  async findById(personId: string): Promise<Student | undefined> {
    const rows = await this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        emailVerified: emailVerifiedExpression,
        phone: people.phone,
        avatar: people.avatar,
        addressLine1: people.addressLine1,
        addressLine2: people.addressLine2,
        city: people.city,
        state: people.state,
        postalCode: people.postalCode,
        country: people.country,
        lat: people.lat,
        lng: people.lng,
        dob: studentProfiles.dob,
        gender: studentProfiles.gender,
        learningGoal: studentProfiles.learningGoal,
        intendedSubject: studentProfiles.intendedSubject,
        leadId: studentProfiles.leadId,
        isDeleted: studentProfiles.isDeleted,
        deletedAt: studentProfiles.deletedAt,
        createdAt: studentProfiles.createdAt,
        updatedAt: studentProfiles.updatedAt,
      })
      .from(studentProfiles)
      .innerJoin(people, eq(studentProfiles.personId, people.id))
      .leftJoin(user, eq(user.personId, people.id))
      .where(
        and(
          eq(studentProfiles.personId, personId),
          eq(studentProfiles.isDeleted, false),
          eq(people.isDeleted, false),
        ),
      )
      .limit(1);

    return normalizeStudentRow(rows[0]);
  }

  async update(
    personId: string,
    payload: UpdateStudentDto,
  ): Promise<Student | undefined> {
    const normalizedEmail = this.normalizeEmail(payload.email);

    if (payload.email !== undefined && normalizedEmail) {
      const [existing] = await this.db
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.email, normalizedEmail),
            eq(people.isDeleted, false),
            ne(people.id, personId),
          ),
        )
        .limit(1);

      if (existing) {
        throw new Error('EMAIL_EXISTS');
      }
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      avatar,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      lat,
      lng,
      dob,
      gender,
      learningGoal,
      intendedSubject,
      leadId,
    } = payload;

    return this.db.transaction(async (tx) => {
      if (
        firstName !== undefined ||
        lastName !== undefined ||
        email !== undefined ||
        phone !== undefined ||
        avatar !== undefined ||
        addressLine1 !== undefined ||
        addressLine2 !== undefined ||
        city !== undefined ||
        state !== undefined ||
        postalCode !== undefined ||
        country !== undefined ||
        lat !== undefined ||
        lng !== undefined
      ) {
        await tx
          .update(people)
          .set({
            firstName,
            lastName,
            email: email === undefined ? undefined : normalizedEmail,
            phone,
            avatar,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            lat,
            lng,
          })
          .where(and(eq(people.id, personId), eq(people.isDeleted, false)));
      }

      if (
        dob !== undefined ||
        gender !== undefined ||
        learningGoal !== undefined ||
        intendedSubject !== undefined ||
        leadId !== undefined
      ) {
        await tx
          .update(studentProfiles)
          .set({
            dob,
            gender,
            learningGoal,
            intendedSubject,
            leadId,
          })
          .where(
            and(
              eq(studentProfiles.personId, personId),
              eq(studentProfiles.isDeleted, false),
            ),
          );
      }

      const rows = await tx
        .select({
          personId: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          email: people.email,
          emailVerified: emailVerifiedExpression,
          phone: people.phone,
          avatar: people.avatar,
          addressLine1: people.addressLine1,
          addressLine2: people.addressLine2,
          city: people.city,
          state: people.state,
          postalCode: people.postalCode,
          country: people.country,
          lat: people.lat,
          lng: people.lng,
          dob: studentProfiles.dob,
          gender: studentProfiles.gender,
          learningGoal: studentProfiles.learningGoal,
          intendedSubject: studentProfiles.intendedSubject,
          leadId: studentProfiles.leadId,
          isDeleted: studentProfiles.isDeleted,
          deletedAt: studentProfiles.deletedAt,
          createdAt: studentProfiles.createdAt,
          updatedAt: studentProfiles.updatedAt,
        })
        .from(studentProfiles)
        .innerJoin(people, eq(studentProfiles.personId, people.id))
        .leftJoin(user, eq(user.personId, people.id))
        .where(
          and(
            eq(studentProfiles.personId, personId),
            eq(studentProfiles.isDeleted, false),
            eq(people.isDeleted, false),
          ),
        )
        .limit(1);

      return normalizeStudentRow(rows[0]);
    });
  }

  async softDelete(personId: string): Promise<Student | undefined> {
    const deletedAt = new Date();
    return this.db.transaction(async (tx) => {
      await tx
        .update(people)
        .set({ isDeleted: true, deletedAt })
        .where(and(eq(people.id, personId), eq(people.isDeleted, false)));

      await tx
        .update(studentProfiles)
        .set({ isDeleted: true, deletedAt })
        .where(
          and(
            eq(studentProfiles.personId, personId),
            eq(studentProfiles.isDeleted, false),
          ),
        );

      const rows = await tx
        .select({
          personId: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          email: people.email,
          emailVerified: emailVerifiedExpression,
          phone: people.phone,
          avatar: people.avatar,
          addressLine1: people.addressLine1,
          addressLine2: people.addressLine2,
          city: people.city,
          state: people.state,
          postalCode: people.postalCode,
          country: people.country,
          lat: people.lat,
          lng: people.lng,
          dob: studentProfiles.dob,
          gender: studentProfiles.gender,
          learningGoal: studentProfiles.learningGoal,
          intendedSubject: studentProfiles.intendedSubject,
          leadId: studentProfiles.leadId,
          isDeleted: studentProfiles.isDeleted,
          deletedAt: studentProfiles.deletedAt,
          createdAt: studentProfiles.createdAt,
          updatedAt: studentProfiles.updatedAt,
        })
        .from(studentProfiles)
        .innerJoin(people, eq(studentProfiles.personId, people.id))
        .leftJoin(user, eq(user.personId, people.id))
        .where(eq(studentProfiles.personId, personId))
        .limit(1);

      return normalizeStudentRow(rows[0]);
    });
  }

  async hardDelete(personId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(studentProfiles).where(eq(studentProfiles.personId, personId));
      const [removed] = await tx
        .delete(people)
        .where(eq(people.id, personId))
        .returning({ id: people.id });
      return Boolean(removed);
    });
  }

  async restore(personId: string): Promise<Student | undefined> {
    const restoredAt = new Date();
    return this.db.transaction(async (tx) => {
      await tx
        .update(people)
        .set({ isDeleted: false, deletedAt: null, updatedAt: restoredAt })
        .where(eq(people.id, personId));

      await tx
        .update(studentProfiles)
        .set({ isDeleted: false, deletedAt: null, updatedAt: restoredAt })
        .where(eq(studentProfiles.personId, personId));

      const rows = await tx
        .select({
          personId: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          email: people.email,
          emailVerified: emailVerifiedExpression,
          phone: people.phone,
          avatar: people.avatar,
          addressLine1: people.addressLine1,
          addressLine2: people.addressLine2,
          city: people.city,
          state: people.state,
          postalCode: people.postalCode,
          country: people.country,
          lat: people.lat,
          lng: people.lng,
          dob: studentProfiles.dob,
          gender: studentProfiles.gender,
          learningGoal: studentProfiles.learningGoal,
          intendedSubject: studentProfiles.intendedSubject,
          leadId: studentProfiles.leadId,
          isDeleted: studentProfiles.isDeleted,
          deletedAt: studentProfiles.deletedAt,
          createdAt: studentProfiles.createdAt,
          updatedAt: studentProfiles.updatedAt,
        })
        .from(studentProfiles)
        .innerJoin(people, eq(studentProfiles.personId, people.id))
        .leftJoin(user, eq(user.personId, people.id))
        .where(eq(studentProfiles.personId, personId))
        .limit(1);

      return normalizeStudentRow(rows[0]);
    });
  }
}
