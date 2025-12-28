import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DRIZZLE_DB } from '../db/db.constants';
import type { DrizzleDb } from '../db/db.types';
import { users } from '../db/schema';
import { CreateUserDto, UpdateUserDto, User } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  private async generateUniqueId(): Promise<string> {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = nanoid(8);
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, candidate))
        .limit(1);

      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Failed to generate a unique user id');
  }

  async create(payload: CreateUserDto): Promise<User> {
    if (payload.email) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, payload.email))
        .limit(1);

      if (existing) {
        throw new Error('EMAIL_EXISTS');
      }
    }

    const id = await this.generateUniqueId();
    const [created] = await this.db
      .insert(users)
      .values({
        id,
        name: payload.name,
        email: payload.email ?? null,
      })
      .returning();
    return created;
  }

  async findAll(includeDeleted: boolean): Promise<User[]> {
    if (includeDeleted) {
      return this.db.select().from(users);
    }
    return this.db.select().from(users).where(eq(users.deleted, false));
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.deleted, false)));
    return user;
  }

  async update(id: string, payload: UpdateUserDto): Promise<User | undefined> {
    const updatePayload: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updatePayload.name = payload.name;
    }

    if (payload.email !== undefined) {
      updatePayload.email = payload.email ?? null;
    }

    const [updated] = await this.db
      .update(users)
      .set(updatePayload)
      .where(and(eq(users.id, id), eq(users.deleted, false)))
      .returning();

    return updated;
  }

  async softDelete(id: string): Promise<User | undefined> {
    const [updated] = await this.db
      .update(users)
      .set({ deleted: true, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.deleted, false)))
      .returning();

    return updated;
  }

  async hardDelete(id: string): Promise<User | undefined> {
    const [removed] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    return removed;
  }
}
