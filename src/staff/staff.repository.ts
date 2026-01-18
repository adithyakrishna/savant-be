import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import {
  employeeOrgAssignments,
  people,
  roleAssignments,
  staffProfiles,
  user,
} from '@/db/schema';
import type {
  CreateStaffInput,
  StaffFilterInput,
  StaffProfile,
  StaffRole,
  UpdateStaffInput,
} from '@/staff/staff.types';

const emailVerifiedExpression = sql<boolean>`
  coalesce(${user.emailVerified}, false)
`;

type StaffRow = StaffProfile & { emailVerified?: boolean | null };

function normalizeStaffRow(row?: StaffRow): StaffProfile | undefined {
  if (!row) {
    return undefined;
  }
  return {
    ...row,
    emailVerified: Boolean(row.emailVerified),
  };
}

@Injectable()
export class StaffRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  private normalizeEmail(email?: string | null): string | null {
    if (email === undefined || email === null) {
      return null;
    }
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  async create(payload: CreateStaffInput, orgId: string) {
    const personId = nanoid(10);
    const normalizedEmail = this.normalizeEmail(payload.email ?? null);

    return this.db.transaction(async (tx) => {
      const [person] = await tx
        .insert(people)
        .values({
          id: personId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: normalizedEmail,
          phone: payload.phone ?? null,
          avatar: payload.avatar ?? null,
        })
        .returning();

      const [profile] = await tx
        .insert(staffProfiles)
        .values({
          personId,
          bio: payload.bio ?? null,
          active: false,
        })
        .returning();

      await tx
        .insert(employeeOrgAssignments)
        .values({ personId, orgId })
        .onConflictDoUpdate({
          target: employeeOrgAssignments.personId,
          set: {
            orgId,
            updatedAt: new Date(),
          },
        });

      return {
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        avatar: person.avatar,
        bio: profile.bio,
        role: payload.role,
        active: profile.active,
        isDeleted: profile.isDeleted,
        emailVerified: false,
        deletedAt: profile.deletedAt,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      } satisfies StaffProfile;
    });
  }

  async findById(personId: string, orgId: string) {
    const [row] = await this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        avatar: people.avatar,
        bio: staffProfiles.bio,
        role: roleAssignments.role,
        active: staffProfiles.active,
        isDeleted: staffProfiles.isDeleted,
        deletedAt: staffProfiles.deletedAt,
        createdAt: staffProfiles.createdAt,
        updatedAt: staffProfiles.updatedAt,
        emailVerified: emailVerifiedExpression,
      })
      .from(people)
      .innerJoin(staffProfiles, eq(staffProfiles.personId, people.id))
      .innerJoin(
        employeeOrgAssignments,
        eq(employeeOrgAssignments.personId, people.id),
      )
      .leftJoin(user, eq(user.personId, people.id))
      .leftJoin(roleAssignments, eq(roleAssignments.userId, user.id))
      .where(
        and(eq(people.id, personId), eq(employeeOrgAssignments.orgId, orgId)),
      );

    return normalizeStaffRow(row as StaffRow | undefined);
  }

  async findAll(filter: StaffFilterInput, orgId: string) {
    const conditions = [
      eq(employeeOrgAssignments.orgId, orgId),
      filter.includeDeleted ? undefined : eq(staffProfiles.isDeleted, false),
      filter.role ? eq(roleAssignments.role, filter.role) : undefined,
      filter.search
        ? ilike(
            sql`${people.firstName} || ' ' || ${people.lastName}`,
            `%${filter.search}%`,
          )
        : undefined,
    ].filter(Boolean);

    const rows = await this.db
      .select({
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        avatar: people.avatar,
        bio: staffProfiles.bio,
        role: roleAssignments.role,
        active: staffProfiles.active,
        isDeleted: staffProfiles.isDeleted,
        deletedAt: staffProfiles.deletedAt,
        createdAt: staffProfiles.createdAt,
        updatedAt: staffProfiles.updatedAt,
        emailVerified: emailVerifiedExpression,
      })
      .from(people)
      .innerJoin(staffProfiles, eq(staffProfiles.personId, people.id))
      .innerJoin(
        employeeOrgAssignments,
        eq(employeeOrgAssignments.personId, people.id),
      )
      .leftJoin(user, eq(user.personId, people.id))
      .leftJoin(roleAssignments, eq(roleAssignments.userId, user.id))
      .where(and(...(conditions as Array<ReturnType<typeof eq>>)));

    return rows.map((row) => normalizeStaffRow(row as StaffRow)!);
  }

  async update(
    personId: string,
    payload: UpdateStaffInput,
    role?: StaffRole,
    active?: boolean,
  ) {
    return this.db.transaction(async (tx) => {
      if (
        payload.firstName !== undefined ||
        payload.lastName !== undefined ||
        payload.email !== undefined ||
        payload.phone !== undefined ||
        payload.avatar !== undefined
      ) {
        await tx
          .update(people)
          .set({
            firstName: payload.firstName,
            lastName: payload.lastName,
            email:
              payload.email === undefined
                ? undefined
                : this.normalizeEmail(payload.email ?? null),
            phone: payload.phone ?? null,
            avatar: payload.avatar ?? null,
          })
          .where(eq(people.id, personId));
      }

      if (payload.bio !== undefined || active !== undefined) {
        await tx
          .update(staffProfiles)
          .set({
            bio: payload.bio,
            active: active === undefined ? undefined : active,
            updatedAt: new Date(),
          })
          .where(eq(staffProfiles.personId, personId));
      }

      if (role) {
        const [existingUser] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.personId, personId));
        if (existingUser) {
          await tx
            .delete(roleAssignments)
            .where(eq(roleAssignments.userId, existingUser.id));
          await tx.insert(roleAssignments).values({
            id: nanoid(10),
            userId: existingUser.id,
            role,
            scopeId: 'GLOBAL',
          });
        }
      }

      const [row] = await tx
        .select({
          personId: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          email: people.email,
          phone: people.phone,
          avatar: people.avatar,
          bio: staffProfiles.bio,
          role: roleAssignments.role,
          active: staffProfiles.active,
          isDeleted: staffProfiles.isDeleted,
          deletedAt: staffProfiles.deletedAt,
          createdAt: staffProfiles.createdAt,
          updatedAt: staffProfiles.updatedAt,
          emailVerified: emailVerifiedExpression,
        })
        .from(people)
        .innerJoin(staffProfiles, eq(staffProfiles.personId, people.id))
        .leftJoin(user, eq(user.personId, people.id))
        .leftJoin(roleAssignments, eq(roleAssignments.userId, user.id))
        .where(eq(people.id, personId));

      return normalizeStaffRow(row as StaffRow | undefined);
    });
  }

  async softDelete(personId: string) {
    const [row] = await this.db
      .update(staffProfiles)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.personId, personId))
      .returning();

    return row ? true : false;
  }

  async restore(personId: string) {
    const [row] = await this.db
      .update(staffProfiles)
      .set({
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.personId, personId))
      .returning();

    return row ? true : false;
  }

  async hardDelete(personId: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(staffProfiles)
        .where(eq(staffProfiles.personId, personId));
      await tx.delete(people).where(eq(people.id, personId));
      return true;
    });
  }

  async getTeacherIdsInOrg(personIds: string[], orgId: string) {
    if (personIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({ personId: staffProfiles.personId })
      .from(staffProfiles)
      .innerJoin(
        employeeOrgAssignments,
        eq(employeeOrgAssignments.personId, staffProfiles.personId),
      )
      .innerJoin(user, eq(user.personId, staffProfiles.personId))
      .innerJoin(roleAssignments, eq(roleAssignments.userId, user.id))
      .where(
        and(
          eq(employeeOrgAssignments.orgId, orgId),
          inArray(staffProfiles.personId, personIds),
          eq(roleAssignments.role, 'TEACHER'),
        ),
      );

    return rows.map((row) => row.personId);
  }
}
