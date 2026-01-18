import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_DB } from '@/db/db.constants';
import type { DrizzleDb } from '@/db/db.types';
import {
  attendancePeriodicSummaries,
  attendanceEvents,
  attendanceSettings,
  employeeOrgAssignments,
} from '@/db/schema';
import type {
  AttendanceEvent,
  AttendanceEventType,
  AttendanceStatus,
  AttendancePeriodicSummary,
  AttendanceSettings,
  AttendanceWeekStart,
} from '@/attendance/attendance.types';

@Injectable()
export class AttendanceRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getLatestEvent(personId: string): Promise<AttendanceEvent | undefined> {
    const [event] = await this.db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.personId, personId))
      .orderBy(desc(attendanceEvents.eventAt))
      .limit(1);
    return event as AttendanceEvent | undefined;
  }

  async listEvents(
    personId: string,
    start: Date,
    end: Date,
  ): Promise<AttendanceEvent[]> {
    const rows = await this.db
      .select()
      .from(attendanceEvents)
      .where(
        and(
          eq(attendanceEvents.personId, personId),
          gte(attendanceEvents.eventAt, start),
          lte(attendanceEvents.eventAt, end),
        ),
      )
      .orderBy(asc(attendanceEvents.eventAt));
    return rows as AttendanceEvent[];
  }

  async createEvent(
    personId: string,
    eventType: AttendanceEventType,
    eventAt: Date,
  ): Promise<AttendanceEvent> {
    const [event] = await this.db
      .insert(attendanceEvents)
      .values({
        id: randomUUID(),
        personId,
        eventType,
        eventAt,
      })
      .returning();
    return event as AttendanceEvent;
  }

  async getSettings(orgId: string): Promise<AttendanceSettings | undefined> {
    const [settings] = await this.db
      .select()
      .from(attendanceSettings)
      .where(eq(attendanceSettings.orgId, orgId))
      .limit(1);
    return settings as AttendanceSettings | undefined;
  }

  async upsertSettings(payload: {
    orgId: string;
    periodDays: number;
    weekStart: AttendanceWeekStart;
    updatedBy: string | null;
  }): Promise<AttendanceSettings> {
    const [settings] = await this.db
      .insert(attendanceSettings)
      .values({
        orgId: payload.orgId,
        periodDays: payload.periodDays,
        weekStart: payload.weekStart,
        updatedBy: payload.updatedBy,
      })
      .onConflictDoUpdate({
        target: attendanceSettings.orgId,
        set: {
          periodDays: payload.periodDays,
          weekStart: payload.weekStart,
          updatedBy: payload.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();

    return settings as AttendanceSettings;
  }

  async upsertSummary(payload: {
    personId: string;
    orgId: string;
    periodStart: string;
    periodEnd: string;
    periodDays: number;
    totalMinutes: number;
    firstIn: Date | null;
    lastOut: Date | null;
    status: AttendanceStatus;
  }): Promise<AttendancePeriodicSummary> {
    const [summary] = await this.db
      .insert(attendancePeriodicSummaries)
      .values({
        id: randomUUID(),
        personId: payload.personId,
        orgId: payload.orgId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        periodDays: payload.periodDays,
        totalMinutes: payload.totalMinutes,
        firstIn: payload.firstIn,
        lastOut: payload.lastOut,
        status: payload.status,
      })
      .onConflictDoUpdate({
        target: [
          attendancePeriodicSummaries.personId,
          attendancePeriodicSummaries.orgId,
          attendancePeriodicSummaries.periodStart,
        ],
        set: {
          periodEnd: payload.periodEnd,
          periodDays: payload.periodDays,
          totalMinutes: payload.totalMinutes,
          firstIn: payload.firstIn,
          lastOut: payload.lastOut,
          status: payload.status,
          updatedAt: new Date(),
        },
      })
      .returning();

    return summary as AttendancePeriodicSummary;
  }

  async listSummaries(
    personId: string,
    orgId: string,
    startDate: string,
    endDate: string,
  ) {
    const rows = await this.db
      .select()
      .from(attendancePeriodicSummaries)
      .where(
        and(
          eq(attendancePeriodicSummaries.personId, personId),
          eq(attendancePeriodicSummaries.orgId, orgId),
          gte(attendancePeriodicSummaries.periodStart, startDate),
          lte(attendancePeriodicSummaries.periodStart, endDate),
        ),
      )
      .orderBy(asc(attendancePeriodicSummaries.periodStart));

    return rows as AttendancePeriodicSummary[];
  }

  async listDirectReportIds(
    managerId: string,
    orgId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ personId: employeeOrgAssignments.personId })
      .from(employeeOrgAssignments)
      .where(
        and(
          eq(employeeOrgAssignments.managerId, managerId),
          eq(employeeOrgAssignments.orgId, orgId),
        ),
      );

    return rows.map((row) => row.personId);
  }

  async listSummariesForPeople(
    personIds: string[],
    orgId: string,
    startDate: string,
    endDate: string,
  ) {
    if (personIds.length === 0) {
      return [] as AttendancePeriodicSummary[];
    }

    const rows = await this.db
      .select()
      .from(attendancePeriodicSummaries)
      .where(
        and(
          eq(attendancePeriodicSummaries.orgId, orgId),
          gte(attendancePeriodicSummaries.periodStart, startDate),
          lte(attendancePeriodicSummaries.periodStart, endDate),
          inArray(attendancePeriodicSummaries.personId, personIds),
        ),
      )
      .orderBy(asc(attendancePeriodicSummaries.periodStart));

    return rows as AttendancePeriodicSummary[];
  }
}
