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
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { HrmsAccessGuard } from '@/hrms/hrms.guard';
import { HrmsAllowSelf } from '@/hrms/hrms.decorators';
import { OrgContextGuard, RequestWithOrg } from '@/org/org.guard';
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

@Controller('attendance')
@UseGuards(VerifiedUserGuard, HrmsAccessGuard, OrgContextGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch/:personId')
  @HrmsAllowSelf()
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
  getSettings(@Req() req: Request) {
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.attendanceService.getSettings(orgId);
  }

  @Patch('settings')
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
