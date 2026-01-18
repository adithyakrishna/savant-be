import { z } from 'zod';

export type AttendanceEventType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
export type AttendanceStatus = 'ABSENT' | 'PRESENT' | 'PARTIAL';
export type AttendanceWeekStart =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface AttendanceEvent {
  id: string;
  personId: string;
  eventType: AttendanceEventType;
  eventAt: Date;
  createdAt: Date;
}

export interface AttendancePeriodicSummary {
  id: string;
  personId: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
  periodDays: number;
  totalMinutes: number;
  firstIn: Date | null;
  lastOut: Date | null;
  status: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceSettings {
  orgId: string;
  periodDays: number;
  weekStart: AttendanceWeekStart;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const optionalString = z.string().trim().min(1).optional();

export const weekStartSchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const punchSchema = z.object({
  eventType: z.enum(['IN', 'OUT', 'BREAK_START', 'BREAK_END']),
  eventAt: z.string().datetime().optional(),
});

export const attendanceRangeSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const attendanceQuerySchema = attendanceRangeSchema.extend({
  personId: optionalString,
});

export const reportingQuerySchema = z.object({
  includeReports: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const attendanceSettingsSchema = z.object({
  periodDays: z.number().int().min(1).max(365),
  weekStart: weekStartSchema,
});

export type PunchDto = z.infer<typeof punchSchema>;
export type AttendanceRangeDto = z.infer<typeof attendanceRangeSchema>;
export type AttendanceQueryDto = z.infer<typeof attendanceQuerySchema>;
export type ReportingQueryDto = z.infer<typeof reportingQuerySchema>;
export type AttendanceSettingsDto = z.infer<typeof attendanceSettingsSchema>;
