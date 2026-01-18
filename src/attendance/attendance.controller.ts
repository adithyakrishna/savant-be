import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { HrmsAccessGuard } from '@/hrms/hrms.guard';
import { HrmsAllowSelf } from '@/hrms/hrms.decorators';
import { OrgContextGuard, RequestWithOrg } from '@/org/org.guard';
import { ORG_HEADER_KEY } from '@/org/org.constants';
import { VerifiedUserGuard } from '@/rbac/rbac.guard';
import { AttendanceService } from '@/attendance/attendance.service';
import type {
  AttendanceQueryDto,
  AttendanceRangeDto,
  PunchDto,
  AttendanceSettingsDto,
} from '@/attendance/attendance.types';
import {
  attendanceQuerySchema,
  attendanceRangeSchema,
  attendanceSettingsSchema,
  punchSchema,
} from '@/attendance/attendance.types';

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithOrgContext = RequestWithSession & RequestWithOrg;

@ApiTags('Attendance')
@ApiBearerAuth()
@ApiHeader({ name: ORG_HEADER_KEY, required: true, example: 'ORG-0' })
@Controller('attendance')
@UseGuards(VerifiedUserGuard, HrmsAccessGuard, OrgContextGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch/:personId')
  @HrmsAllowSelf()
  @ApiOperation({ summary: 'Record an attendance punch' })
  @ApiParam({ name: 'personId', description: 'Person ID to punch for' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['eventType'],
      properties: {
        eventType: {
          type: 'string',
          enum: ['IN', 'OUT', 'BREAK_START', 'BREAK_END'],
        },
        eventAt: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-01T08:30:00.000Z',
        },
      },
    },
  })
  punch(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(punchSchema)) body: PunchDto,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.punch(session, personId, orgId, body);
  }

  @Get('events/:personId')
  @HrmsAllowSelf()
  @ApiOperation({ summary: 'List attendance events for a person' })
  @ApiParam({ name: 'personId', description: 'Person ID to list events for' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  listEvents(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Query(new ZodValidationPipe(attendanceRangeSchema))
    query: AttendanceRangeDto,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.listEvents(session, personId, orgId, query);
  }

  @Get('summaries')
  @HrmsAllowSelf()
  @ApiOperation({ summary: 'List attendance summaries' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'personId',
    required: false,
    description: 'Filter to a specific person',
  })
  listSummaries(
    @Req() req: Request,
    @Query(new ZodValidationPipe(attendanceQuerySchema))
    query: AttendanceQueryDto,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.listSummaries(session, query, orgId);
  }

  @Get('team-summaries')
  @ApiOperation({ summary: 'List attendance summaries for direct reports' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)' })
  listTeamSummaries(
    @Req() req: Request,
    @Query(new ZodValidationPipe(attendanceRangeSchema))
    query: AttendanceRangeDto,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.listTeamSummaries(session, query, orgId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get attendance settings for the org' })
  getSettings(@Req() req: Request) {
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.getSettings(orgId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update attendance settings for the org' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['periodDays', 'weekStart'],
      properties: {
        periodDays: { type: 'number', example: 7 },
        weekStart: {
          type: 'string',
          enum: [
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
            'FRIDAY',
            'SATURDAY',
            'SUNDAY',
          ],
        },
      },
    },
  })
  updateSettings(
    @Req() req: Request,
    @Body(new ZodValidationPipe(attendanceSettingsSchema))
    body: AttendanceSettingsDto,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.updateSettings(session, orgId, body);
  }
}
