import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class Instrument {
  @ApiProperty({ example: 'inst_123' })
  id: string;

  @ApiProperty({ example: 'Piano' })
  name: string;

  @ApiPropertyOptional({ example: 'Grand piano' })
  description: string | null;

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

export const createInstrumentSchema = z.object({
  name: z.string().trim().min(1),
  description: optionalString,
});

export const updateInstrumentSchema = z.object({
  name: optionalString,
  description: optionalString,
});

export const instrumentFilterSchema = z.object({
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  search: optionalString,
});

export class CreateInstrumentDto {
  @ApiProperty({ example: 'Piano' })
  name: string;

  @ApiPropertyOptional({ example: 'Grand piano' })
  description?: string;
}

export class UpdateInstrumentDto {
  @ApiPropertyOptional({ example: 'Piano' })
  name?: string;

  @ApiPropertyOptional({ example: 'Grand piano' })
  description?: string;
}

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
export type UpdateInstrumentInput = z.infer<typeof updateInstrumentSchema>;
export type InstrumentFilterInput = z.infer<typeof instrumentFilterSchema>;
