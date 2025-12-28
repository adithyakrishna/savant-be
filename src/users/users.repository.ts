import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { users } from '@/db/schema';
import { CreateUserDto, UpdateUserDto, User } from '@/users/users.types';

@Injectable()
export class UsersRepository {
  private nanoid?: (size?: number) => string;

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  private async getNanoid(): Promise<(size?: number) => string> {
    if (!this.nanoid) {
      const { nanoid } = await import('nanoid');
      this.nanoid = nanoid;
    }
    return this.nanoid;
  }

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
    return maybe.code === '23505' && maybe.constraint === 'users_email_unique';
  }

  private async generateUniqueId(): Promise<string> {
    const maxAttempts = 5;
    const nanoid = await this.getNanoid();

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
    const normalizedEmail = this.normalizeEmail(payload.email);

    if (normalizedEmail) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, normalizedEmail), eq(users.deleted, false)))
        .limit(1);

      if (existing) {
        throw new Error('EMAIL_EXISTS');
      }
    }

    const id = await this.generateUniqueId();
    try {
      const [created] = await this.db
        .insert(users)
        .values({
          id,
          name: payload.name,
          email: normalizedEmail,
        })
        .returning();
      return created;
    } catch (error) {
      if (this.isEmailUniqueViolation(error)) {
        throw new Error('EMAIL_EXISTS');
      }
      throw error;
    }
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
      const normalizedEmail = this.normalizeEmail(payload.email);

      if (normalizedEmail) {
        const [existing] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.email, normalizedEmail),
              eq(users.deleted, false),
              ne(users.id, id),
            ),
          )
          .limit(1);

        if (existing) {
          throw new Error('EMAIL_EXISTS');
        }
      }

      updatePayload.email = normalizedEmail;
    }

    try {
      const [updated] = await this.db
        .update(users)
        .set(updatePayload)
        .where(and(eq(users.id, id), eq(users.deleted, false)))
        .returning();

      return updated;
    } catch (error) {
      if (this.isEmailUniqueViolation(error)) {
        throw new Error('EMAIL_EXISTS');
      }
      throw error;
    }
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
