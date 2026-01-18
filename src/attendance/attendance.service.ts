import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthSession } from '@/auth/auth.service';
import type { Env } from '@/config/env';
import { RbacService } from '@/rbac/rbac.service';
import type {
  AttendancePeriodicSummary,
  AttendanceEvent,
  AttendanceEventType,
  AttendanceSettings,
  AttendanceStatus,
  AttendanceRangeDto,
  AttendanceQueryDto,
  AttendanceWeekStart,
  PunchDto,
  AttendanceSettingsDto,
} from '@/attendance/attendance.types';
import { AttendanceRepository } from '@/attendance/attendance.repository';

const EVENT_ORDER: AttendanceEventType[] = [
  'IN',
  'BREAK_START',
  'BREAK_END',
  'OUT',
];

const WEEK_START_INDEX: Record<AttendanceWeekStart, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function parseDateRange(range: AttendanceRangeDto) {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Invalid date range');
  }
  return { start, end };
}

function classifyStatus(
  totalMinutes: number,
  firstIn: Date | null,
  lastOut: Date | null,
): AttendanceStatus {
  if (!firstIn && !lastOut) {
    return 'ABSENT';
  }
  if (totalMinutes <= 0) {
    return 'PARTIAL';
  }
  return 'PRESENT';
}

function buildSummary(events: AttendanceEvent[]) {
  if (events.length === 0) {
    return { totalMinutes: 0, firstIn: null, lastOut: null };
  }

  const sorted = [...events].sort(
    (a, b) => a.eventAt.getTime() - b.eventAt.getTime(),
  );
  const firstInEvent = sorted.find((event) => event.eventType === 'IN') ?? null;
  const lastOutEvent =
    [...sorted].reverse().find((event) => event.eventType === 'OUT') ?? null;

  let totalMinutes = 0;
  let currentIn: Date | null = null;
  let breakStart: Date | null = null;

  for (const event of sorted) {
    if (event.eventType === 'IN') {
      currentIn = event.eventAt;
      breakStart = null;
    }
    if (event.eventType === 'BREAK_START' && currentIn) {
      breakStart = event.eventAt;
    }
    if (event.eventType === 'BREAK_END' && breakStart && currentIn) {
      totalMinutes += minutesBetween(breakStart, event.eventAt);
      breakStart = null;
    }
    if (event.eventType === 'OUT' && currentIn) {
      totalMinutes += minutesBetween(currentIn, event.eventAt);
      currentIn = null;
      breakStart = null;
    }
  }

  return {
    totalMinutes: Math.max(0, totalMinutes),
    firstIn: firstInEvent ? firstInEvent.eventAt : null,
    lastOut: lastOutEvent ? lastOutEvent.eventAt : null,
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date, weekStart: AttendanceWeekStart) {
  const dayIndex = date.getDay();
  const target = WEEK_START_INDEX[weekStart];
  const diff = (dayIndex - target + 7) % 7;
  return addDays(date, -diff);
}

function resolvePeriod(
  date: Date,
  periodDays: number,
  weekStart: AttendanceWeekStart,
) {
  const anchor = startOfWeek(date, weekStart);
  const daysSinceAnchor = Math.floor(
    (date.getTime() - anchor.getTime()) / 86400000,
  );
  const periodIndex = Math.floor(daysSinceAnchor / periodDays);
  const periodStart = addDays(anchor, periodIndex * periodDays);
  const periodEnd = addDays(periodStart, periodDays - 1);
  return { periodStart, periodEnd };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly rbacService: RbacService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  private getTimeZone() {
    return this.configService.get('APP_TIMEZONE', { infer: true });
  }

  private parseEventAt(payload: PunchDto) {
    if (payload.eventAt) {
      const parsed = new Date(payload.eventAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid eventAt timestamp');
      }
      return parsed;
    }
    return new Date();
  }

  private validateSequence(
    lastEvent: AttendanceEvent | undefined,
    nextEvent: AttendanceEventType,
  ) {
    if (!lastEvent) {
      if (nextEvent !== 'IN') {
        throw new BadRequestException('First punch must be IN');
      }
      return;
    }

    const lastIndex = EVENT_ORDER.indexOf(lastEvent.eventType);
    const nextIndex = EVENT_ORDER.indexOf(nextEvent);

    if (nextIndex === -1) {
      throw new BadRequestException('Invalid event type');
    }

    if (lastEvent.eventType === 'OUT' && nextEvent !== 'IN') {
      throw new BadRequestException('Next punch must start with IN after OUT');
    }

    if (nextIndex === lastIndex) {
      throw new BadRequestException(`Duplicate ${nextEvent} punch not allowed`);
    }

    if (
      nextIndex < lastIndex &&
      !(lastEvent.eventType === 'OUT' && nextEvent === 'IN')
    ) {
      throw new BadRequestException(
        `Invalid punch order after ${lastEvent.eventType}`,
      );
    }

    if (lastEvent.eventType === 'IN' && nextEvent === 'BREAK_END') {
      throw new BadRequestException('BREAK_END requires BREAK_START');
    }

    if (lastEvent.eventType === 'BREAK_START' && nextEvent === 'OUT') {
      throw new BadRequestException('OUT requires BREAK_END');
    }
  }

  private normalizeEventDate(eventAt: Date) {
    return formatDate(eventAt, this.getTimeZone());
  }

  private async loadSettings(orgId: string): Promise<AttendanceSettings> {
    const settings = await this.attendanceRepository.getSettings(orgId);
    if (settings) {
      return settings;
    }

    return this.attendanceRepository.upsertSettings({
      orgId,
      periodDays: 7,
      weekStart: 'TUESDAY',
      updatedBy: null,
    });
  }

  private async refreshSummary(personId: string, orgId: string, eventAt: Date) {
    const settings = await this.loadSettings(orgId);
    const { periodStart, periodEnd } = resolvePeriod(
      eventAt,
      settings.periodDays,
      settings.weekStart,
    );

    const startOfDay = new Date(
      `${this.normalizeEventDate(periodStart)}T00:00:00.000Z`,
    );
    const endOfDay = new Date(
      `${this.normalizeEventDate(periodEnd)}T23:59:59.999Z`,
    );

    const events = await this.attendanceRepository.listEvents(
      personId,
      startOfDay,
      endOfDay,
    );
    const { totalMinutes, firstIn, lastOut } = buildSummary(events);
    const status = classifyStatus(totalMinutes, firstIn, lastOut);

    return this.attendanceRepository.upsertSummary({
      personId,
      orgId,
      periodStart: this.normalizeEventDate(periodStart),
      periodEnd: this.normalizeEventDate(periodEnd),
      periodDays: settings.periodDays,
      totalMinutes,
      firstIn,
      lastOut,
      status,
    });
  }

  private async ensureAccess(
    session: AuthSession,
    targetPersonId: string,
    orgId: string,
    includeReports = false,
  ) {
    if (!session?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const roles = await this.rbacService.getUserScopeRoles(session.user.id);
    if (roles.has('SUPER_ADMIN') || roles.has('ADMIN')) {
      return;
    }

    if (session.user.personId && session.user.personId === targetPersonId) {
      return;
    }

    if (includeReports && session.user.personId) {
      const reports = await this.attendanceRepository.listDirectReportIds(
        session.user.personId,
        orgId,
      );
      if (reports.includes(targetPersonId)) {
        return;
      }
    }

    throw new ForbiddenException('Insufficient privileges');
  }

  async punch(
    session: AuthSession,
    personId: string,
    orgId: string,
    payload: PunchDto,
  ) {
    await this.ensureAccess(session, personId, orgId);

    const eventAt = this.parseEventAt(payload);
    const lastEvent = await this.attendanceRepository.getLatestEvent(personId);
    this.validateSequence(lastEvent, payload.eventType);

    const event = await this.attendanceRepository.createEvent(
      personId,
      payload.eventType,
      eventAt,
    );

    const summary = await this.refreshSummary(personId, orgId, eventAt);
    return { event, summary };
  }

  async listEvents(
    session: AuthSession,
    personId: string,
    orgId: string,
    range: AttendanceRangeDto,
  ) {
    await this.ensureAccess(session, personId, orgId, true);
    const { start, end } = parseDateRange(range);
    return this.attendanceRepository.listEvents(personId, start, end);
  }

  async listSummaries(
    session: AuthSession,
    query: AttendanceQueryDto,
    orgId: string,
  ) {
    const { startDate, endDate, personId } = query;
    if (!personId && !session?.user?.personId) {
      throw new BadRequestException('personId is required');
    }

    const targetPersonId = personId ?? session?.user?.personId;
    if (!targetPersonId) {
      throw new BadRequestException('personId is required');
    }

    await this.ensureAccess(session, targetPersonId, orgId, true);

    return this.attendanceRepository.listSummaries(
      targetPersonId,
      orgId,
      startDate,
      endDate,
    );
  }

  async listTeamSummaries(
    session: AuthSession,
    range: AttendanceRangeDto,
    orgId: string,
  ) {
    if (!session?.user?.personId) {
      throw new ForbiddenException('Not authenticated');
    }

    const roles = await this.rbacService.getUserScopeRoles(session.user.id);
    if (!(roles.has('SUPER_ADMIN') || roles.has('ADMIN'))) {
      throw new ForbiddenException('Insufficient privileges');
    }

    const reports = await this.attendanceRepository.listDirectReportIds(
      session.user.personId,
      orgId,
    );
    if (reports.length === 0) {
      return [] as AttendancePeriodicSummary[];
    }

    return this.attendanceRepository.listSummariesForPeople(
      reports,
      orgId,
      range.startDate,
      range.endDate,
    );
  }

  async getSettings(orgId: string) {
    return this.loadSettings(orgId);
  }

  async updateSettings(
    session: AuthSession,
    orgId: string,
    payload: AttendanceSettingsDto,
  ) {
    if (!session?.user) {
      throw new ForbiddenException('Not authenticated');
    }

    const roles = await this.rbacService.getUserScopeRoles(session.user.id);
    if (!roles.has('SUPER_ADMIN')) {
      throw new ForbiddenException('Insufficient privileges');
    }

    return this.attendanceRepository.upsertSettings({
      orgId,
      periodDays: payload.periodDays,
      weekStart: payload.weekStart,
      updatedBy: session.user.id,
    });
  }
}

export const attendanceHelpers = {
  classifyStatus,
  parseDateRange,
  buildSummary,
  resolvePeriod,
};
