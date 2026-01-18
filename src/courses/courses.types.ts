import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const courseDifficultySchema = z.enum([
  'FOUNDATION',
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

export type CourseDifficulty = z.infer<typeof courseDifficultySchema>;

export class Course {
  @ApiProperty({ example: 'course_123' })
  id: string;

  @ApiProperty({ example: 'Piano 101' })
  name: string;

  @ApiProperty({
    enum: ['FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  difficulty: CourseDifficulty;

  @ApiPropertyOptional({ example: 'Intro to piano' })
  description: string | null;

  @ApiPropertyOptional({ example: 'inst_123' })
  instrumentId: string | null;

  @ApiProperty({ example: [] })
  teacherIds: string[];

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  deletedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-02T00:00:00.000Z' })
  updatedAt: Date;
}

const optionalString = z.string().trim().min(1).optional();

export const createCourseSchema = z.object({
  name: z.string().trim().min(1),
  difficulty: courseDifficultySchema.optional(),
  description: optionalString,
  instrumentId: optionalString.nullable().optional(),
  teacherIds: z.array(z.string().trim().min(1)).optional(),
});

export const updateCourseSchema = z.object({
  name: optionalString,
  difficulty: courseDifficultySchema.optional(),
  description: optionalString,
  instrumentId: optionalString.nullable().optional(),
  teacherIds: z.array(z.string().trim().min(1)).optional(),
});

export const assignCourseTeachersSchema = z.object({
  teacherIds: z.array(z.string().trim().min(1)),
});

export const courseFilterSchema = z.object({
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  search: optionalString,
  difficulty: courseDifficultySchema.optional(),
});

export class CreateCourseDto {
  @ApiProperty({ example: 'Piano 101' })
  name: string;

  @ApiPropertyOptional({
    enum: ['FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ example: 'Intro to piano' })
  description?: string;

  @ApiPropertyOptional({ example: 'inst_123', nullable: true })
  instrumentId?: string | null;

  @ApiPropertyOptional({ example: ['person_123'] })
  teacherIds?: string[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Piano 101' })
  name?: string;

  @ApiPropertyOptional({
    enum: ['FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ example: 'Intro to piano' })
  description?: string;

  @ApiPropertyOptional({ example: 'inst_123', nullable: true })
  instrumentId?: string | null;

  @ApiPropertyOptional({ example: ['person_123'] })
  teacherIds?: string[];
}

export class AssignCourseTeachersDto {
  @ApiProperty({ example: ['person_123'] })
  teacherIds: string[];
}

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AssignCourseTeachersInput = z.infer<
  typeof assignCourseTeachersSchema
>;
export type CourseFilterInput = z.infer<typeof courseFilterSchema>;
