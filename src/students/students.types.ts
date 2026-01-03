import { z } from 'zod';

export interface Student {
  personId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  avatar: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  dob: string | null;
  gender: string | null;
  learningGoal: string | null;
  intendedSubject: string | null;
  leadId: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
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

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
