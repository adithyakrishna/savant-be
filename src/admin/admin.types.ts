import { z } from 'zod';
import { DEFAULT_SCOPE_ID } from '@/rbac/rbac.types';

const baseProvisionUserSchema = z.object({
  personId: z.string().min(1),
  email: z.email().optional(),
  emailVerificationCallbackURL: z.string().url().optional(),
  scopeId: z.string().min(1).default(DEFAULT_SCOPE_ID),
});

const studentProvisionUserSchema = baseProvisionUserSchema.extend({
  role: z.literal('STUDENT'),
  passwordResetRedirectTo: z.string().url(),
});

const staffProvisionUserSchema = baseProvisionUserSchema.extend({
  role: z.enum(['ADMIN', 'STAFF', 'TEACHER', 'PARENT']),
  passwordResetRedirectTo: z.string().url().optional(),
});

export const provisionUserSchema = z.discriminatedUnion('role', [
  studentProvisionUserSchema,
  staffProvisionUserSchema,
]);

export type ProvisionUserDto = z.infer<typeof provisionUserSchema>;
