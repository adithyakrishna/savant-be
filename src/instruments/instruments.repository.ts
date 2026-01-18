import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import { instruments } from '@/db/schema';
import type {
  CreateInstrumentInput,
  InstrumentFilterInput,
  Instrument,
  UpdateInstrumentInput,
} from '@/instruments/instruments.types';

@Injectable()
export class InstrumentsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(payload: CreateInstrumentInput, orgId: string) {
    const [row] = await this.db
      .insert(instruments)
      .values({
        id: nanoid(10),
        name: payload.name,
        description: payload.description ?? null,
        orgId,
      })
      .returning();

    return row as Instrument;
  }

  async findAll(filter: InstrumentFilterInput, orgId: string) {
    const conditions = [eq(instruments.orgId, orgId)];

    if (!filter.includeDeleted) {
      conditions.push(eq(instruments.isDeleted, false));
    }

    if (filter.search) {
      conditions.push(ilike(instruments.name, `%${filter.search}%`));
    }

    return this.db
      .select()
      .from(instruments)
      .where(and(...conditions));
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.db
      .select()
      .from(instruments)
      .where(and(eq(instruments.id, id), eq(instruments.orgId, orgId)))
      .limit(1);
    return row as Instrument | undefined;
  }

  async update(id: string, orgId: string, payload: UpdateInstrumentInput) {
    const [row] = await this.db
      .update(instruments)
      .set({
        name: payload.name,
        description: payload.description ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(instruments.id, id), eq(instruments.orgId, orgId)))
      .returning();

    return row as Instrument | undefined;
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.db
      .update(instruments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(instruments.id, id), eq(instruments.orgId, orgId)))
      .returning();

    return row ? true : false;
  }

  async restore(id: string, orgId: string) {
    const [row] = await this.db
      .update(instruments)
      .set({
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(instruments.id, id), eq(instruments.orgId, orgId)))
      .returning();

    return row ? true : false;
  }

  async hardDelete(id: string, orgId: string) {
    const [row] = await this.db
      .delete(instruments)
      .where(and(eq(instruments.id, id), eq(instruments.orgId, orgId)))
      .returning();

    return row ? true : false;
  }
}
