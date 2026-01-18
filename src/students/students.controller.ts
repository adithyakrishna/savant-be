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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import { StudentsService } from '@/students/students.service';
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from '@/students/students.types';
import {
  createStudentSchema,
  updateStudentSchema,
} from '@/students/students.types';

type RequestWithSession = Request & { authSession?: AuthSession };

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'List students' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted students',
  })
  getStudents(
    @Req() req: Request,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.getAll(
      actorSession ?? null,
      includeDeleted === 'true',
    );
  }

  @Get(':personId')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Get a student by person ID' })
  @ApiParam({ name: 'personId', description: 'Student person ID' })
  getStudent(@Req() req: Request, @Param('personId') personId: string) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.getOne(actorSession ?? null, personId);
  }

  @Post()
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Create a student' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firstName', 'lastName'],
      properties: {
        firstName: { type: 'string', example: 'Ada' },
        lastName: { type: 'string', example: 'Lovelace' },
        email: { type: 'string', nullable: true, example: 'ada@example.com' },
        phone: { type: 'string', example: '+15551234567' },
        avatar: {
          type: 'string',
          example: 'https://cdn.example.com/avatar.png',
        },
        addressLine1: { type: 'string', example: '123 Main St' },
        addressLine2: { type: 'string', example: 'Apt 4B' },
        city: { type: 'string', example: 'San Francisco' },
        state: { type: 'string', example: 'CA' },
        postalCode: { type: 'string', example: '94105' },
        country: { type: 'string', example: 'US' },
        lat: { type: 'number', example: 37.7749 },
        lng: { type: 'number', example: -122.4194 },
        dob: { type: 'string', example: '2000-01-01' },
        gender: { type: 'string', example: 'FEMALE' },
        learningGoal: { type: 'string', example: 'Learn calculus' },
        intendedSubject: { type: 'string', example: 'Mathematics' },
        leadId: { type: 'string', example: 'lead_123' },
      },
    },
  })
  createStudent(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentInput,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.createOne(actorSession ?? null, body);
  }

  @Patch(':personId')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({ summary: 'Update a student' })
  @ApiParam({ name: 'personId', description: 'Student person ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Ada' },
        lastName: { type: 'string', example: 'Lovelace' },
        email: { type: 'string', nullable: true, example: 'ada@example.com' },
        phone: { type: 'string', example: '+15551234567' },
        avatar: {
          type: 'string',
          example: 'https://cdn.example.com/avatar.png',
        },
        addressLine1: { type: 'string', example: '123 Main St' },
        addressLine2: { type: 'string', example: 'Apt 4B' },
        city: { type: 'string', example: 'San Francisco' },
        state: { type: 'string', example: 'CA' },
        postalCode: { type: 'string', example: '94105' },
        country: { type: 'string', example: 'US' },
        lat: { type: 'number', example: 37.7749 },
        lng: { type: 'number', example: -122.4194 },
        dob: { type: 'string', example: '2000-01-01' },
        gender: { type: 'string', example: 'FEMALE' },
        learningGoal: { type: 'string', example: 'Learn calculus' },
        intendedSubject: { type: 'string', example: 'Mathematics' },
        leadId: { type: 'string', example: 'lead_123' },
      },
    },
  })
  updateStudent(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentInput,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.updateOne(actorSession ?? null, personId, body);
  }

  @Delete(':personId')
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Delete a student' })
  @ApiParam({ name: 'personId', description: 'Student person ID' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Use hard delete instead of soft delete',
  })
  deleteStudent(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Query('hard') hard?: string,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    const doHardDelete = hard === 'true';
    return this.studentsService.deleteOne(
      actorSession ?? null,
      personId,
      doHardDelete,
    );
  }

  @Post(':personId/restore')
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  @ApiOperation({ summary: 'Restore a deleted student' })
  @ApiParam({ name: 'personId', description: 'Student person ID' })
  restoreStudent(@Req() req: Request, @Param('personId') personId: string) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.restoreOne(actorSession ?? null, personId);
  }
}
