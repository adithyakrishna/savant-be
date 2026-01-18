import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class Student {
  @ApiProperty({ example: 'person_123' })
  personId: string;

  @ApiProperty({ example: 'Ada' })
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  lastName: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  email: string | null;

  @ApiProperty({ example: false })
  emailVerified: boolean;

  @ApiPropertyOptional({ example: '+15551234567' })
  phone: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar: string | null;

  @ApiPropertyOptional({ example: '123 Main St' })
  addressLine1: string | null;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  addressLine2: string | null;

  @ApiPropertyOptional({ example: 'San Francisco' })
  city: string | null;

  @ApiPropertyOptional({ example: 'CA' })
  state: string | null;

  @ApiPropertyOptional({ example: '94105' })
  postalCode: string | null;

  @ApiPropertyOptional({ example: 'US' })
  country: string | null;

  @ApiPropertyOptional({ example: 37.7749 })
  lat: number | null;

  @ApiPropertyOptional({ example: -122.4194 })
  lng: number | null;

  @ApiPropertyOptional({ example: '2000-01-01' })
  dob: string | null;

  @ApiPropertyOptional({ example: 'FEMALE' })
  gender: string | null;

  @ApiPropertyOptional({ example: 'Learn calculus' })
  learningGoal: string | null;

  @ApiPropertyOptional({ example: 'Mathematics' })
  intendedSubject: string | null;

  @ApiPropertyOptional({ example: 'lead_123' })
  leadId: string | null;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  deletedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-02T00:00:00.000Z' })
  updatedAt: Date;
}

const emailSchema = z
  .union([z.string().trim().email(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' ? null : value));

const optionalString = z.string().trim().min(1).optional();

export const createStudentSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: emailSchema,
  phone: optionalString,
  avatar: optionalString,
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  postalCode: optionalString,
  country: optionalString,
  lat: z.number().optional(),
  lng: z.number().optional(),
  dob: optionalString,
  gender: optionalString,
  learningGoal: optionalString,
  intendedSubject: optionalString,
  leadId: optionalString,
});

export const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: emailSchema,
  phone: optionalString,
  avatar: optionalString,
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  postalCode: optionalString,
  country: optionalString,
  lat: z.number().optional(),
  lng: z.number().optional(),
  dob: optionalString,
  gender: optionalString,
  learningGoal: optionalString,
  intendedSubject: optionalString,
  leadId: optionalString,
});

export class CreateStudentDto {
  @ApiProperty({ example: 'Ada' })
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  lastName: string;

  @ApiProperty({ example: 'ada@example.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+15551234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'San Francisco' })
  city?: string;

  @ApiPropertyOptional({ example: 'CA' })
  state?: string;

  @ApiPropertyOptional({ example: '94105' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'US' })
  country?: string;

  @ApiPropertyOptional({ example: 37.7749 })
  lat?: number;

  @ApiPropertyOptional({ example: -122.4194 })
  lng?: number;

  @ApiPropertyOptional({ example: '2000-01-01' })
  dob?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  gender?: string;

  @ApiPropertyOptional({ example: 'Learn calculus' })
  learningGoal?: string;

  @ApiPropertyOptional({ example: 'Mathematics' })
  intendedSubject?: string;

  @ApiPropertyOptional({ example: 'lead_123' })
  leadId?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Ada' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lovelace' })
  lastName?: string;

  @ApiProperty({ example: 'ada@example.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+15551234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'San Francisco' })
  city?: string;

  @ApiPropertyOptional({ example: 'CA' })
  state?: string;

  @ApiPropertyOptional({ example: '94105' })
  postalCode?: string;

  @ApiPropertyOptional({ example: 'US' })
  country?: string;

  @ApiPropertyOptional({ example: 37.7749 })
  lat?: number;

  @ApiPropertyOptional({ example: -122.4194 })
  lng?: number;

  @ApiPropertyOptional({ example: '2000-01-01' })
  dob?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  gender?: string;

  @ApiPropertyOptional({ example: 'Learn calculus' })
  learningGoal?: string;

  @ApiPropertyOptional({ example: 'Mathematics' })
  intendedSubject?: string;

  @ApiPropertyOptional({ example: 'lead_123' })
  leadId?: string;
}

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
