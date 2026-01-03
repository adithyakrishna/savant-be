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
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import { StudentsService } from '@/students/students.service';
import type { CreateStudentDto, UpdateStudentDto } from '@/students/students.types';
import { createStudentSchema, updateStudentSchema } from '@/students/students.types';

type RequestWithSession = Request & { authSession?: AuthSession };

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  getStudents(
    @Req() req: Request,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.getAll(actorSession ?? null, includeDeleted === 'true');
  }

  @Get(':personId')
  @UseGuards(VerifiedUserGuard)
  getStudent(@Req() req: Request, @Param('personId') personId: string) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.getOne(actorSession ?? null, personId);
  }

  @Post()
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  createStudent(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentDto,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.createOne(actorSession ?? null, body);
  }

  @Patch(':personId')
  @UseGuards(VerifiedUserGuard)
  updateStudent(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentDto,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.updateOne(actorSession ?? null, personId, body);
  }

  @Delete(':personId')
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  deleteStudent(
    @Req() req: Request,
    @Param('personId') personId: string,
    @Query('hard') hard?: string,
  ) {
    const actorSession = (req as RequestWithSession).authSession;
    const doHardDelete = hard === 'true';
    return this.studentsService.deleteOne(actorSession ?? null, personId, doHardDelete);
  }

  @Post(':personId/restore')
  @UseGuards(VerifiedUserGuard, RolesGuard)
  @RequireRoles(['SUPER_ADMIN', 'ADMIN'])
  restoreStudent(@Req() req: Request, @Param('personId') personId: string) {
    const actorSession = (req as RequestWithSession).authSession;
    return this.studentsService.restoreOne(actorSession ?? null, personId);
  }
}
