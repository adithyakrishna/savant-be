import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class AttendanceEvent {
  @ApiProperty({ example: 'evt_123' })
  id: string;

  @ApiProperty({ example: 'person_123' })
  personId: string;

  @ApiProperty({ enum: ['IN', 'OUT', 'BREAK_START', 'BREAK_END'] })
  eventType: AttendanceEventType;

  @ApiProperty({ example: '2025-01-01T08:30:00.000Z' })
  eventAt: Date;

  @ApiProperty({ example: '2025-01-01T08:31:00.000Z' })
  createdAt: Date;
}

export class AttendancePeriodicSummary {
  @ApiProperty({ example: 'sum_123' })
  id: string;

  @ApiProperty({ example: 'person_123' })
  personId: string;

  @ApiProperty({ example: 'ORG-0' })
  orgId: string;

  @ApiProperty({ example: '2025-01-01' })
  periodStart: string;

  @ApiProperty({ example: '2025-01-07' })
  periodEnd: string;

  @ApiProperty({ example: 7 })
  periodDays: number;

  @ApiProperty({ example: 2100 })
  totalMinutes: number;

  @ApiPropertyOptional({ example: '2025-01-01T08:30:00.000Z' })
  firstIn: Date | null;

  @ApiPropertyOptional({ example: '2025-01-07T17:30:00.000Z' })
  lastOut: Date | null;

  @ApiProperty({ enum: ['ABSENT', 'PRESENT', 'PARTIAL'] })
  status: AttendanceStatus;

  @ApiProperty({ example: '2025-01-07T18:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-07T18:10:00.000Z' })
  updatedAt: Date;
}

export class AttendanceSettings {
  @ApiProperty({ example: 'ORG-0' })
  orgId: string;

  @ApiProperty({ example: 7 })
  periodDays: number;

  @ApiProperty({
    enum: [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ],
  })
  weekStart: AttendanceWeekStart;

  @ApiPropertyOptional({ example: 'user_123' })
  updatedBy: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-07T00:00:00.000Z' })
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

export class PunchDto {
  @ApiProperty({ enum: ['IN', 'OUT', 'BREAK_START', 'BREAK_END'] })
  eventType: AttendanceEventType;

  @ApiPropertyOptional({
    example: '2025-01-01T08:30:00.000Z',
    description: 'Defaults to now when omitted',
  })
  eventAt?: string;
}

export class AttendanceRangeDto {
  @ApiProperty({ example: '2025-01-01' })
  startDate: string;

  @ApiProperty({ example: '2025-01-07' })
  endDate: string;
}

export class AttendanceQueryDto extends AttendanceRangeDto {
  @ApiPropertyOptional({ example: 'person_123' })
  personId?: string;
}

export class ReportingQueryDto {
  @ApiPropertyOptional({ example: true })
  includeReports?: boolean;
}

export class AttendanceSettingsDto {
  @ApiProperty({ example: 7 })
  periodDays: number;

  @ApiProperty({
    enum: [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ],
  })
  weekStart: AttendanceWeekStart;
}

export type PunchInput = z.infer<typeof punchSchema>;
export type AttendanceRangeInput = z.infer<typeof attendanceRangeSchema>;
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
export type AttendanceSettingsInput = z.infer<typeof attendanceSettingsSchema>;
