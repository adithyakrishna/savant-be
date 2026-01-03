import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { AuthService } from '@/auth/auth.service';
import { AdminService } from '@/admin/admin.service';
import { RbacService } from '@/rbac/rbac.service';
import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';

describe('AdminController (e2e)', () => {
  let app: INestApplication<App>;
  const authService = { getSession: jest.fn() };
  const rbacService = {
    requireVerifiedUser: jest.fn((session) => {
      if (!session?.user?.emailVerified) {
        throw new ForbiddenException('Email not verified');
      }
    }),
    requireRole: jest.fn(),
  };
  const adminService = { provisionUser: jest.fn() };
  const pgPool = { end: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(RbacService)
      .useValue(rbacService)
      .overrideProvider(AdminService)
      .useValue(adminService)
      .overrideProvider(PG_POOL)
      .useValue(pgPool)
      .overrideProvider(DRIZZLE_DB)
      .useValue({})
      .overrideProvider(AUTH_INSTANCE)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/admin/provision-user (POST) requires authentication', () => {
    authService.getSession.mockResolvedValueOnce(null);

    return request(app.getHttpServer())
      .post('/admin/provision-user')
      .send({
        personId: 'person-1',
        role: 'STUDENT',
        passwordResetRedirectTo: 'https://app.example.com/reset-password',
      })
      .expect(401);
  });

  it('/admin/provision-user (POST) blocks unverified users', () => {
    authService.getSession.mockResolvedValueOnce({
      session: { userId: 'actor-1' },
      user: {
        id: 'actor-1',
        email: 'admin@example.com',
        emailVerified: false,
        personId: null,
      },
    });

    return request(app.getHttpServer())
      .post('/admin/provision-user')
      .send({
        personId: 'person-1',
        role: 'STUDENT',
        passwordResetRedirectTo: 'https://app.example.com/reset-password',
      })
      .expect(403);
  });

  it('/admin/provision-user (POST) rejects insufficient roles', () => {
    authService.getSession.mockResolvedValueOnce({
      session: { userId: 'actor-1' },
      user: {
        id: 'actor-1',
        email: 'admin@example.com',
        emailVerified: true,
        personId: null,
      },
    });
    rbacService.requireRole.mockImplementationOnce(() => {
      throw new ForbiddenException('Insufficient role');
    });

    return request(app.getHttpServer())
      .post('/admin/provision-user')
      .send({
        personId: 'person-1',
        role: 'STUDENT',
        passwordResetRedirectTo: 'https://app.example.com/reset-password',
      })
      .expect(403);
  });

  it('/admin/provision-user (POST) returns created payload when authorized', async () => {
    const session = {
      session: { userId: 'actor-1' },
      user: {
        id: 'actor-1',
        email: 'admin@example.com',
        emailVerified: true,
        personId: null,
      },
    };
    authService.getSession.mockResolvedValueOnce(session);
    adminService.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      personId: 'person-1',
      email: 'student@example.com',
      role: 'STUDENT',
      scopeId: 'GLOBAL',
    });

    const response = await request(app.getHttpServer())
      .post('/admin/provision-user')
      .send({
        personId: 'person-1',
        role: 'STUDENT',
        passwordResetRedirectTo: 'https://app.example.com/reset-password',
      })
      .expect(201);

    expect(adminService.provisionUser).toHaveBeenCalledWith(session, {
      personId: 'person-1',
      role: 'STUDENT',
      passwordResetRedirectTo: 'https://app.example.com/reset-password',
      scopeId: 'GLOBAL',
    });
    expect(response.body).toMatchObject({
      userId: 'user-1',
      personId: 'person-1',
      email: 'student@example.com',
      role: 'STUDENT',
      scopeId: 'GLOBAL',
    });
  });
});
