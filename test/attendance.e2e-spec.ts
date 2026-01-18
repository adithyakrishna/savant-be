import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { AuthService } from '@/auth/auth.service';
import { RbacService } from '@/rbac/rbac.service';
import { AttendanceService } from '@/attendance/attendance.service';
import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { ORG_HEADER_KEY } from '@/org/org.constants';

describe('AttendanceController (e2e)', () => {
  let app: INestApplication<App>;
  const authService = { getSession: jest.fn() };
  const rbacService = {
    requireVerifiedUser: jest.fn((session) => {
      if (!session?.user?.emailVerified) {
        throw new ForbiddenException('Email not verified');
      }
    }),
    getUserScopeRoles: jest.fn(),
  };
  const attendanceService = {
    punch: jest.fn(),
    listEvents: jest.fn(),
    listSummaries: jest.fn(),
    listTeamSummaries: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };
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
      .overrideProvider(AttendanceService)
      .useValue(attendanceService)
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

  it('/attendance/punch/:personId (POST) requires authentication', () => {
    authService.getSession.mockResolvedValueOnce(null);

    return request(app.getHttpServer())
      .post('/attendance/punch/person-1')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .send({ eventType: 'IN' })
      .expect(401);
  });

  it('/attendance/punch/:personId (POST) rejects non-hrms roles', () => {
    authService.getSession.mockResolvedValueOnce({
      session: { userId: 'actor-1' },
      user: {
        id: 'actor-1',
        email: 'staff@example.com',
        emailVerified: true,
        personId: 'person-1',
      },
    });
    rbacService.getUserScopeRoles.mockResolvedValueOnce(new Set(['STAFF']));

    return request(app.getHttpServer())
      .post('/attendance/punch/person-1')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .send({ eventType: 'IN' })
      .expect(403);
  });

  it('/attendance/punch/:personId (POST) allows hrms admin role', async () => {
    const session = {
      session: { userId: 'actor-1' },
      user: {
        id: 'actor-1',
        email: 'admin@example.com',
        emailVerified: true,
        personId: 'person-1',
      },
    };
    authService.getSession.mockResolvedValueOnce(session);
    rbacService.getUserScopeRoles.mockResolvedValueOnce(new Set(['ADMIN']));
    attendanceService.punch.mockResolvedValueOnce({ ok: true });

    const response = await request(app.getHttpServer())
      .post('/attendance/punch/person-1')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .send({ eventType: 'IN' })
      .expect(201);

    expect(attendanceService.punch).toHaveBeenCalledWith(
      session,
      'person-1',
      'ORG-0',
      {
        eventType: 'IN',
      },
    );
    expect(response.body).toEqual({ ok: true });
  });
});
