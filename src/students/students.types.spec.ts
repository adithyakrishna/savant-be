import { createStudentSchema, updateStudentSchema } from '@/students/students.types';

describe('students.types', () => {
  it('normalizes email values', () => {
    const created = createStudentSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '',
    });
    expect(created.email).toBeNull();

    const updated = updateStudentSchema.parse({
      email: 'user@example.com',
    });
    expect(updated.email).toBe('user@example.com');
  });
});
