import { sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

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
  (table) => ({
    usersEmailUnique: uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deleted} = false`),
  }),
);

export * from '@/auth/better-auth.schema';
