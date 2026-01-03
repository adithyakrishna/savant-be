import { DatabaseService } from '@/db/db.service';

describe('DatabaseService', () => {
  it('closes the pool on destroy', async () => {
    const pool = { end: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new DatabaseService(pool);

    await service.onModuleDestroy();
    expect(pool.end).toHaveBeenCalled();
  });
});
