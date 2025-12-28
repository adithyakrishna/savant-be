import { z } from 'zod';

export interface User {
  id: string;
  name: string;
  email: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emailSchema = z
  .union([z.string().trim().email(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' ? null : value));

export const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: emailSchema,
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
