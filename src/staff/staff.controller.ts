import {
  Body,
  Controller,
  Delete,
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
import { ORG_HEADER_KEY } from '@/org/org.constants';
import { OrgContextGuard, RequestWithOrg } from '@/org/org.guard';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import {
  createStaffSchema,
  staffFilterSchema,
  updateStaffSchema,
} from '@/staff/staff.types';
import type {
  CreateStaffInput,
  StaffFilterInput,
  UpdateStaffInput,
} from '@/staff/staff.types';
import { StaffService } from '@/staff/staff.service';

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithOrgContext = RequestWithSession & RequestWithOrg;

@ApiTags('Staff')
@ApiBearerAuth()
@ApiHeader({ name: ORG_HEADER_KEY, required: true, example: 'ORG-0' })
@Controller('staff')
@UseGuards(VerifiedUserGuard, RolesGuard, OrgContextGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'List staff members' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted staff records',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by staff role',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name',
  })
  listStaff(
    @Req() req: Request,
    @Query(new ZodValidationPipe(staffFilterSchema)) query: StaffFilterInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.staffService.listAll(session, query, orgId);
  }

  @Get(':personId')
  @ApiOperation({ summary: 'Get a staff profile' })
  @ApiParam({ name: 'personId', description: 'Staff person ID' })
  getStaff(@Req() req: Request, @Param('personId') personId: string) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.staffService.getOne(session, personId, orgId);
  }

  @Post()
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Create a staff member' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firstName', 'lastName', 'role'],
      properties: {
        firstName: { type: 'string', example: 'Ada' },
        lastName: { type: 'string', example: 'Lovelace' },
        email: { type: 'string', nullable: true, example: 'ada@example.com' },
        phone: { type: 'string', nullable: true, example: '+15551234567' },
        avatar: {
          type: 'string',
          example: 'https://cdn.example.com/avatar.png',
        },
        bio: { type: 'string', example: 'Music instructor' },
        role: { type: 'string', enum: ['ADMIN', 'STAFF', 'TEACHER'] },
      },
    },
  })
  createStaff(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createStaffSchema)) body: CreateStaffInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.staffService.createOne(session, body, orgId);
  }

  @Patch(':personId')
  @ApiOperation({ summary: 'Update a staff profile' })
  @ApiParam({ name: 'personId', description: 'Staff person ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Ada' },
        lastName: { type: 'string', example: 'Lovelace' },
        email: { type: 'string', nullable: true, example: 'ada@example.com' },
        phone: { type: 'string', nullable: true, example: '+15551234567' },
        avatar: {
          type: 'string',
          example: 'https://cdn.example.com/avatar.png',
        },
        bio: { type: 'string', example: 'Music instructor' },
        role: { type: 'string', enum: ['ADMIN', 'STAFF', 'TEACHER'] },
        active: { type: 'boolean', example: true },
      },
    },
  })
  updateStaff(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) body: UpdateStaffInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.staffService.updateOne(session, personId, body, orgId);
  }

  @Delete(':personId')
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Delete a staff member' })
  @ApiParam({ name: 'personId', description: 'Staff person ID' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Use hard delete instead of soft delete',
  })
  deleteStaff(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Query('hard') hard?: string,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const doHardDelete = hard === 'true';
    return this.staffService.deleteOne(session, personId, doHardDelete);
  }

  @Post(':personId/restore')
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Restore a staff profile' })
  @ApiParam({ name: 'personId', description: 'Staff person ID' })
  restoreStaff(@Req() req: Request, @Param('personId') personId: string) {
    const session = (req as RequestWithSession).authSession ?? null;
    return this.staffService.restoreOne(session, personId);
  }
}
