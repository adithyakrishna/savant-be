import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
  assignCourseTeachersSchema,
  courseFilterSchema,
  createCourseSchema,
  updateCourseSchema,
} from '@/courses/courses.types';
import type {
  AssignCourseTeachersInput,
  CourseFilterInput,
  CreateCourseInput,
  UpdateCourseInput,
} from '@/courses/courses.types';
import { CoursesService } from '@/courses/courses.service';

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithOrgContext = RequestWithSession & RequestWithOrg;

@ApiTags('Courses')
@ApiBearerAuth()
@ApiHeader({ name: ORG_HEADER_KEY, required: true, example: 'ORG-0' })
@Controller('courses')
@UseGuards(VerifiedUserGuard, RolesGuard, OrgContextGuard)
@RequireRoles(['SUPER_ADMIN', 'ADMIN'])
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List courses' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted courses',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    description: 'Filter by difficulty',
  })
  listCourses(
    @Req() req: Request,
    @Query(new ZodValidationPipe(courseFilterSchema)) query: CourseFilterInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.listAll(session, query, orgId);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  getCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.getOne(session, courseId, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a course' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Piano 101' },
        difficulty: {
          type: 'string',
          enum: ['FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        },
        description: { type: 'string', example: 'Intro to piano' },
        instrumentId: { type: 'string', nullable: true, example: 'inst_123' },
        teacherIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  createCourse(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createCourseSchema)) body: CreateCourseInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.createOne(session, body, orgId);
  }

  @Patch(':courseId')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Piano 101' },
        difficulty: {
          type: 'string',
          enum: ['FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        },
        description: { type: 'string', example: 'Intro to piano' },
        instrumentId: { type: 'string', nullable: true, example: 'inst_123' },
        teacherIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  updateCourse(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) body: UpdateCourseInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.updateOne(session, courseId, body, orgId);
  }

  @Put(':courseId/teachers')
  @ApiOperation({ summary: 'Assign teachers to a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['teacherIds'],
      properties: {
        teacherIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  assignTeachers(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(assignCourseTeachersSchema))
    body: AssignCourseTeachersInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.assignTeachers(
      session,
      courseId,
      body.teacherIds,
      orgId,
    );
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Use hard delete instead of soft delete',
  })
  deleteCourse(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Query('hard') hard?: string,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.deleteOne(
      session,
      courseId,
      hard === 'true',
      orgId,
    );
  }

  @Post(':courseId/restore')
  @ApiOperation({ summary: 'Restore a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  restoreCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.coursesService.restoreOne(session, courseId, orgId);
  }
}
