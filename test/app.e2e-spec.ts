import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { UsersRepository } from '@/users/users.repository';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
} from '@/users/users.types';

const createId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');

const buildInMemoryUsersRepository = () => {
  const store = new Map<string, User>();

  const normalizeEmail = (email?: string | null): string | null => {
    if (email === undefined || email === null) {
      return null;
    }

    const trimmed = email.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const ensureEmailUnique = (email: string, excludeId?: string) => {
    for (const user of store.values()) {
      if (user.deleted) {
        continue;
      }
      if (user.email === email && user.id !== excludeId) {
        throw new Error('EMAIL_EXISTS');
      }
    }
  };

  return {
    async create(payload: CreateUserDto): Promise<User> {
      const normalizedEmail = normalizeEmail(payload.email);

      if (normalizedEmail) {
        ensureEmailUnique(normalizedEmail);
      }

      const now = new Date();
      const user: User = {
        id: createId(),
        name: payload.name,
        email: normalizedEmail,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      };
      store.set(user.id, user);
      return user;
    },
    async findAll(includeDeleted: boolean): Promise<User[]> {
      const users = Array.from(store.values());
      return includeDeleted ? users : users.filter((user) => !user.deleted);
    },
    async findById(id: string): Promise<User | undefined> {
      const user = store.get(id);
      if (!user || user.deleted) {
        return undefined;
      }
      return user;
    },
    async update(id: string, payload: UpdateUserDto): Promise<User | undefined> {
      const user = store.get(id);
      if (!user || user.deleted) {
        return undefined;
      }

      let email = user.email;
      if (payload.email !== undefined) {
        const normalizedEmail = normalizeEmail(payload.email);
        if (normalizedEmail) {
          ensureEmailUnique(normalizedEmail, id);
        }
        email = normalizedEmail;
      }

      const updated: User = {
        ...user,
        name: payload.name ?? user.name,
        email,
        updatedAt: new Date(),
      };
      store.set(id, updated);
      return updated;
    },
    async softDelete(id: string): Promise<User | undefined> {
      const user = store.get(id);
      if (!user || user.deleted) {
        return undefined;
      }
      const updated: User = { ...user, deleted: true, updatedAt: new Date() };
      store.set(id, updated);
      return updated;
    },
    async hardDelete(id: string): Promise<User | undefined> {
      const user = store.get(id);
      if (!user) {
        return undefined;
      }
      store.delete(id);
      return user;
    },
  };
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const usersRepository = buildInMemoryUsersRepository();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersRepository)
      .useValue(usersRepository)
      .overrideProvider(AUTH_INSTANCE)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/users (GET) returns users excluding soft-deleted ones', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com' })
      .expect(201);

    const response = await request(app.getHttpServer()).get('/users').expect(200);
    const match = response.body.find((user: { id: string }) => user.id === created.body.id);
    expect(match).toMatchObject({ id: created.body.id, name: 'Ada Lovelace', deleted: false });
  });

  it('/users/:id (GET) returns a single user', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Grace Hopper', email: 'grace@example.com' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: created.body.id, name: 'Grace Hopper', deleted: false });
  });

  it('/users (POST) creates a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Katherine Johnson', email: 'kj@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Katherine Johnson',
      email: 'kj@example.com',
      deleted: false,
    });
    expect(response.body.id).toHaveLength(8);

    const list = await request(app.getHttpServer()).get('/users');
    const match = list.body.find((user: { id: string }) => user.id === response.body.id);
    expect(match).toBeTruthy();
  });

  it('/users/:id (PATCH) updates a user', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Alan Turing', email: 'alan@example.com' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/users/${created.body.id}`)
      .send({ name: 'Alan Mathison Turing' })
      .expect(200);

    expect(response.body).toMatchObject({ id: created.body.id, name: 'Alan Mathison Turing' });
  });

  it('/users/:id (DELETE) soft deletes by default', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Jane Doe', email: 'jane@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .expect(200)
      .expect({
      removed: true,
      hardDelete: false,
    });

    await request(app.getHttpServer()).get(`/users/${created.body.id}`).expect(404);
    const list = await request(app.getHttpServer()).get('/users?includeDeleted=true');
    const match = list.body.find((user: { id: string }) => user.id === created.body.id);
    expect(match).toMatchObject({ id: created.body.id, deleted: true });
  });

  it('/users/:id (DELETE?hard=true) removes permanently when flag is set', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'John Doe', email: 'john@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}?hard=true`)
      .expect(200)
      .expect({
      removed: true,
      hardDelete: true,
    });

    const list = await request(app.getHttpServer()).get('/users?includeDeleted=true');
    const match = list.body.find((user: { id: string }) => user.id === created.body.id);
    expect(match).toBeUndefined();
    await request(app.getHttpServer()).get(`/users/${created.body.id}`).expect(404);
  });
});
