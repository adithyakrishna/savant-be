import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { people, user } from '@/auth/better-auth.schema';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 8 }).primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    deleted: boolean('deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deleted} = false`),
  ],
);

export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN',
  'ADMIN',
  'STAFF',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'PENDING',
]);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    scopeId: text('scope_id').default('GLOBAL').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('role_assignments_user_role_scope_unique').on(
      table.userId,
      table.role,
      table.scopeId,
    ),
    index('role_assignments_role_idx').on(table.role),
    index('role_assignments_scope_idx').on(table.scopeId),
    index('role_assignments_user_idx').on(table.userId),
  ],
);

export const studentProfiles = pgTable('student_profiles', {
  personId: text('person_id')
    .primaryKey()
    .references(() => people.id, { onDelete: 'cascade' }),
  dob: date('dob'),
  gender: text('gender'),
  learningGoal: text('learning_goal'),
  intendedSubject: text('intended_subject'),
  leadId: text('lead_id'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const parentProfiles = pgTable('parent_profiles', {
  personId: text('person_id')
    .primaryKey()
    .references(() => people.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const staffProfiles = pgTable('staff_profiles', {
  personId: text('person_id')
    .primaryKey()
    .references(() => people.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  active: boolean('active').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const guardianships = pgTable(
  'guardianships',
  {
    id: text('id').primaryKey(),
    studentPersonId: text('student_person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    parentPersonId: text('parent_person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    relationship: text('relationship'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('guardianships_student_parent_unique').on(
      table.studentPersonId,
      table.parentPersonId,
    ),
  ],
);

export * from '@/auth/better-auth.schema';
