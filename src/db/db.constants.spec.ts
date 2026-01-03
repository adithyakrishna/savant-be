import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';

describe('db.constants', () => {
  it('exports tokens', () => {
    expect(PG_POOL).toBe('PG_POOL');
    expect(DRIZZLE_DB).toBe('DRIZZLE_DB');
  });
});
