import {
  AttendanceService,
  attendanceHelpers,
} from '@/attendance/attendance.service';
import { AttendanceRepository } from '@/attendance/attendance.repository';
import { RbacService } from '@/rbac/rbac.service';

const rbacService = {
  getUserScopeRoles: jest.fn(async () => new Set(['STAFF'])),
} as unknown as RbacService;

const attendanceRepository = {
  listDirectReportIds: jest.fn(async () => []),
  getSettings: jest.fn(async () => ({
    orgId: 'ORG-0',
    periodDays: 7,
    weekStart: 'TUESDAY',
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  upsertSettings: jest.fn(async (payload) => ({
    orgId: payload.orgId,
    periodDays: payload.periodDays,
    weekStart: payload.weekStart,
    updatedBy: payload.updatedBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
} as unknown as AttendanceRepository;

const configService = {
  get: jest.fn(() => 'UTC'),
} as any;

describe('AttendanceService helpers', () => {
  it('classifyStatus returns ABSENT without punches', () => {
    expect(attendanceHelpers.classifyStatus(0, null, null)).toBe('ABSENT');
  });

  it('classifyStatus returns PARTIAL when minutes are zero', () => {
    expect(attendanceHelpers.classifyStatus(0, new Date(), null)).toBe(
      'PARTIAL',
    );
  });

  it('classifyStatus returns PRESENT when minutes are positive', () => {
    expect(attendanceHelpers.classifyStatus(60, new Date(), new Date())).toBe(
      'PRESENT',
    );
  });

  it('buildSummary totals minutes between IN and OUT', () => {
    const inTime = new Date('2024-01-01T09:00:00.000Z');
    const outTime = new Date('2024-01-01T10:00:00.000Z');
    const summary = attendanceHelpers.buildSummary([
      {
        id: '1',
        personId: 'p1',
        eventType: 'IN',
        eventAt: inTime,
        createdAt: inTime,
      },
      {
        id: '2',
        personId: 'p1',
        eventType: 'OUT',
        eventAt: outTime,
        createdAt: outTime,
      },
    ]);

    expect(summary.totalMinutes).toBe(60);
    expect(summary.firstIn).toEqual(inTime);
    expect(summary.lastOut).toEqual(outTime);
  });

  it('parseDateRange rejects invalid dates', () => {
    expect(() =>
      attendanceHelpers.parseDateRange({
        startDate: 'bad',
        endDate: 'also-bad',
      }),
    ).toThrow('Invalid date range');
  });

  it('resolvePeriod returns calendar window', () => {
    const date = new Date('2024-01-04T10:00:00.000Z');
    const { periodStart, periodEnd } = attendanceHelpers.resolvePeriod(
      date,
      7,
      'TUESDAY',
    );
    expect(periodStart.toISOString().startsWith('2023-12-26')).toBe(true);
    expect(periodEnd.toISOString().startsWith('2024-01-01')).toBe(true);
  });
});

describe('AttendanceService validation', () => {
  it('rejects first punch not IN', () => {
    const service = new AttendanceService(
      attendanceRepository,
      rbacService,
      configService,
    );

    expect(() => (service as any).validateSequence(undefined, 'OUT')).toThrow(
      'First punch must be IN',
    );
  });
});
