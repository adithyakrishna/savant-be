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
  integer,
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
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

export const orgs = pgTable(
  'orgs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('orgs_name_unique').on(table.name),
    uniqueIndex('orgs_code_unique').on(table.code),
    index('orgs_active_idx').on(table.isActive),
  ],
);

export const orgBranches = pgTable(
  'org_branches',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    address: text('address'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('org_branches_name_unique').on(table.name),
    uniqueIndex('org_branches_code_unique').on(table.code),
    index('org_branches_active_idx').on(table.isActive),
  ],
);

export const orgDepartments = pgTable(
  'org_departments',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code'),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('org_departments_name_unique').on(table.name),
    uniqueIndex('org_departments_code_unique').on(table.code),
    index('org_departments_active_idx').on(table.isActive),
  ],
);

export const orgDesignations = pgTable(
  'org_designations',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    code: text('code'),
    description: text('description'),
    level: integer('level'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('org_designations_title_unique').on(table.title),
    uniqueIndex('org_designations_code_unique').on(table.code),
    index('org_designations_active_idx').on(table.isActive),
  ],
);

export const employeeOrgAssignments = pgTable(
  'employee_org_assignments',
  {
    personId: text('person_id')
      .primaryKey()
      .references(() => people.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    branchId: text('branch_id').references(() => orgBranches.id, {
      onDelete: 'set null',
    }),
    departmentId: text('department_id').references(() => orgDepartments.id, {
      onDelete: 'set null',
    }),
    designationId: text('designation_id').references(() => orgDesignations.id, {
      onDelete: 'set null',
    }),
    managerId: text('manager_id').references(() => people.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('employee_org_assignments_org_idx').on(table.orgId),
    index('employee_org_assignments_manager_idx').on(table.managerId),
    index('employee_org_assignments_branch_idx').on(table.branchId),
    index('employee_org_assignments_department_idx').on(table.departmentId),
    index('employee_org_assignments_designation_idx').on(table.designationId),
  ],
);

export const attendanceEventTypeEnum = pgEnum('attendance_event_type', [
  'IN',
  'OUT',
  'BREAK_START',
  'BREAK_END',
]);

export const attendanceSummaryStatusEnum = pgEnum('attendance_summary_status', [
  'ABSENT',
  'PRESENT',
  'PARTIAL',
]);

export const attendanceEvents = pgTable(
  'attendance_events',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    eventType: attendanceEventTypeEnum('event_type').notNull(),
    eventAt: timestamp('event_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('attendance_events_person_event_idx').on(
      table.personId,
      table.eventAt,
    ),
    index('attendance_events_event_at_idx').on(table.eventAt),
  ],
);

export const attendanceSettingsWeekStartEnum = pgEnum('attendance_week_start', [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const attendanceSettings = pgTable(
  'attendance_settings',
  {
    orgId: text('org_id')
      .primaryKey()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    periodDays: integer('period_days').default(7).notNull(),
    weekStart: attendanceSettingsWeekStartEnum('week_start')
      .default('TUESDAY')
      .notNull(),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('attendance_settings_week_idx').on(table.weekStart)],
);

export const attendancePeriodicSummaries = pgTable(
  'attendance_periodic_summaries',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    periodDays: integer('period_days').notNull(),
    totalMinutes: integer('total_minutes').default(0).notNull(),
    firstIn: timestamp('first_in', { withTimezone: true }),
    lastOut: timestamp('last_out', { withTimezone: true }),
    status: attendanceSummaryStatusEnum('status').default('ABSENT').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('attendance_periodic_unique').on(
      table.personId,
      table.orgId,
      table.periodStart,
    ),
    index('attendance_periodic_org_start_idx').on(
      table.orgId,
      table.periodStart,
    ),
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const parentProfiles = pgTable('parent_profiles', {
  personId: text('person_id')
    .primaryKey()
    .references(() => people.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('guardianships_student_parent_unique').on(
      table.studentPersonId,
      table.parentPersonId,
    ),
  ],
);

export * from '@/auth/better-auth.schema';
