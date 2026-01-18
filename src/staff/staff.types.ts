import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const staffRoleSchema = z.enum(['ADMIN', 'STAFF', 'TEACHER']);

export type StaffRole = z.infer<typeof staffRoleSchema>;

export class StaffProfile {
  @ApiProperty({ example: 'person_123' })
  personId: string;

  @ApiProperty({ example: 'Ada' })
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  lastName: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  email: string | null;

  @ApiPropertyOptional({ example: '+15551234567' })
  phone: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar: string | null;

  @ApiPropertyOptional({ example: 'Music teacher' })
  bio: string | null;

  @ApiProperty({ enum: ['ADMIN', 'STAFF', 'TEACHER'] })
  role: StaffRole;

  @ApiProperty({ example: false })
  active: boolean;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiProperty({ example: false })
  emailVerified: boolean;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  deletedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-02T00:00:00.000Z' })
  updatedAt: Date;
}

const optionalString = z.string().trim().min(1).optional();
const optionalNullableString = z.string().trim().min(1).nullable().optional();
const emailSchema = z
  .union([z.string().trim().email(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' ? null : value));

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: emailSchema,
  phone: optionalNullableString,
  avatar: optionalString,
  bio: optionalString,
  role: staffRoleSchema,
});

export const updateStaffSchema = z.object({
  firstName: optionalString,
  lastName: optionalString,
  email: emailSchema,
  phone: optionalNullableString,
  avatar: optionalString,
  bio: optionalString,
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
});

export const staffFilterSchema = z.object({
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  role: staffRoleSchema.optional(),
  search: optionalString,
});

export class CreateStaffDto {
  @ApiProperty({ example: 'Ada' })
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  lastName: string;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '+15551234567', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: 'Music teacher' })
  bio?: string;

  @ApiProperty({ enum: ['ADMIN', 'STAFF', 'TEACHER'] })
  role: StaffRole;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Ada' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lovelace' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '+15551234567', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: 'Music teacher' })
  bio?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'STAFF', 'TEACHER'] })
  role?: StaffRole;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffFilterInput = z.infer<typeof staffFilterSchema>;
