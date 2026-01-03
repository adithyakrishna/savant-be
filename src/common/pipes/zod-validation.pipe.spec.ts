import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns parsed data when valid', () => {
    const schema = z.object({ name: z.string().min(1) });
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ name: 'Ada' })).toEqual({ name: 'Ada' });
  });

  it('throws BadRequestException with combined message', () => {
    const schema = z.object({ name: z.string().min(2), age: z.number().int() });
    const pipe = new ZodValidationPipe(schema);

    expect(() => pipe.transform({ name: 'A', age: 'nope' })).toThrow(
      BadRequestException,
    );
    try {
      pipe.transform({ name: 'A', age: 'nope' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('Too small');
      expect((error as BadRequestException).message).toContain('Invalid input');
    }
  });
});
