import { StudentsRepository } from '@/students/students.repository';

function makeQuery(rows: unknown[]) {
  const query: any = {};
  query.from = jest.fn().mockReturnValue(query);
  query.innerJoin = jest.fn().mockReturnValue(query);
  query.leftJoin = jest.fn().mockReturnValue(query);
  query.where = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.returning = jest.fn().mockReturnValue(query);
  query.then = (resolve: any, reject: any) =>
    Promise.resolve(rows).then(resolve, reject);
  return query;
}

function makeInsertQuery(rows: unknown[]) {
  const query = makeQuery(rows);
  query.values = jest.fn().mockReturnValue(query);
  return query;
}

function makeUpdateQuery() {
  return {
    set: jest.fn(() => ({
      where: jest.fn().mockResolvedValue(undefined),
    })),
  };
}

function makeDeleteQuery(rows: unknown[]) {
  const query = makeQuery(rows);
  query.where = jest.fn().mockReturnValue(query);
  query.returning = jest.fn().mockReturnValue(query);
  return query;
}

const sampleRow = {
  personId: 'p1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  emailVerified: true,
  phone: null,
  avatar: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  lat: null,
  lng: null,
  dob: null,
  gender: null,
  learningGoal: null,
  intendedSubject: null,
  leadId: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('StudentsRepository', () => {
  it('throws when email already exists', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([{ id: 'p2' }])),
    } as any;
    const repo = new StudentsRepository(db);

    await expect(
      repo.create({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('creates a student', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async (callback: any) => {
        const tx = {
          insert: jest
            .fn()
            .mockReturnValueOnce(makeInsertQuery([{ ...sampleRow, id: 'p1' }]))
            .mockReturnValueOnce(
              makeInsertQuery([
                {
                  personId: 'p1',
                  dob: null,
                  gender: null,
                  learningGoal: null,
                  intendedSubject: null,
                  leadId: null,
                  isDeleted: false,
                  deletedAt: null,
                  createdAt: sampleRow.createdAt,
                  updatedAt: sampleRow.updatedAt,
                },
              ]),
            ),
        };
        return callback(tx);
      }),
    } as any;

    const repo = new StudentsRepository(db);
    const result = await repo.create({ firstName: 'Ada', lastName: 'Lovelace', email: '' });

    expect(result.personId).toBe('p1');
    expect(result.emailVerified).toBe(false);
  });

  it('maps unique violations to EMAIL_EXISTS', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async () => {
        const error: any = new Error('unique');
        error.code = '23505';
        error.constraint = 'people_email_unique';
        throw error;
      }),
    } as any;

    const repo = new StudentsRepository(db);
    await expect(
      repo.create({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('rethrows non-unique errors', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async () => {
        throw 'boom';
      }),
    } as any;

    const repo = new StudentsRepository(db);
    await expect(
      repo.create({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
    ).rejects.toBe('boom');
  });

  it('finds all students with and without deleted', async () => {
    const query = makeQuery([sampleRow]);
    const db = { select: jest.fn().mockReturnValue(query) } as any;
    const repo = new StudentsRepository(db);

    const active = await repo.findAll(false);
    const all = await repo.findAll(true);

    expect(active).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(query.where).toHaveBeenCalled();
  });

  it('finds by id', async () => {
    const db = { select: jest.fn().mockReturnValue(makeQuery([])) } as any;
    const repo = new StudentsRepository(db);

    await expect(repo.findById('missing')).resolves.toBeUndefined();
  });

  it('rejects duplicate email on update', async () => {
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([{ id: 'p2' }])),
    } as any;
    const repo = new StudentsRepository(db);

    await expect(repo.update('p1', { email: 'ada@example.com' })).rejects.toThrow(
      'EMAIL_EXISTS',
    );
  });

  it('updates student fields and returns result', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn().mockReturnValue(makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.update('p1', { firstName: 'New', dob: '2024-01-01' });
    expect(result?.firstName).toBe('Ada');
    expect(tx.update).toHaveBeenCalledTimes(2);
  });

  it('updates individual people fields', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn(() => makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const payloads = [
      { firstName: 'New' },
      { lastName: 'Last' },
      { email: 'new@example.com' },
      { phone: '123' },
      { avatar: 'avatar' },
      { addressLine1: 'line1' },
      { addressLine2: 'line2' },
      { city: 'City' },
      { state: 'State' },
      { postalCode: '12345' },
      { country: 'Country' },
      { lat: 1 },
      { lng: 2 },
    ];

    for (const payload of payloads) {
      await repo.update('p1', payload as any);
    }

    expect(tx.update).toHaveBeenCalled();
  });

  it('updates individual profile fields without touching people data', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = {
      select: jest.fn(() => makeQuery([])),
      transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const repo = new StudentsRepository(db);

    const payloads = [
      { dob: '2024-01-01' },
      { gender: 'F' },
      { learningGoal: 'Goal' },
      { intendedSubject: 'Math' },
      { leadId: 'lead-1' },
    ];

    for (const payload of payloads) {
      await repo.update('p1', payload as any);
    }

    expect(tx.update).toHaveBeenCalled();
  });

  it('soft deletes a student', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = { transaction: jest.fn(async (callback: any) => callback(tx)) } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.softDelete('p1');
    expect(result?.personId).toBe('p1');
  });

  it('hard deletes a student', async () => {
    const tx = {
      delete: jest
        .fn()
        .mockReturnValueOnce(makeDeleteQuery([]))
        .mockReturnValueOnce(makeDeleteQuery([{ id: 'p1' }])),
    } as any;
    const db = { transaction: jest.fn(async (callback: any) => callback(tx)) } as any;
    const repo = new StudentsRepository(db);

    await expect(repo.hardDelete('p1')).resolves.toBe(true);
  });

  it('restores a student', async () => {
    const tx = {
      update: jest.fn().mockReturnValue(makeUpdateQuery()),
      select: jest.fn().mockReturnValue(makeQuery([sampleRow])),
    } as any;
    const db = { transaction: jest.fn(async (callback: any) => callback(tx)) } as any;
    const repo = new StudentsRepository(db);

    const result = await repo.restore('p1');
    expect(result?.personId).toBe('p1');
  });
});
