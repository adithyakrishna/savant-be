import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { AuthService } from '@/auth/auth.service';
import { RbacService } from '@/rbac/rbac.service';
import { OrgService } from '@/org/org.service';
import { DRIZZLE_DB, PG_POOL } from '@/db/db.constants';
import { AUTH_INSTANCE } from '@/auth/auth.constants';
import { ORG_HEADER_KEY } from '@/org/org.constants';

describe('OrgController (e2e)', () => {
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
  const orgService = {
    listBranches: jest.fn(),
    createBranch: jest.fn(),
    updateBranch: jest.fn(),
    deleteBranch: jest.fn(),
    listDepartments: jest.fn(),
    createDepartment: jest.fn(),
    updateDepartment: jest.fn(),
    deleteDepartment: jest.fn(),
    listDesignations: jest.fn(),
    createDesignation: jest.fn(),
    updateDesignation: jest.fn(),
    deleteDesignation: jest.fn(),
    assignOrg: jest.fn(),
    getReportingTree: jest.fn(),
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
      .overrideProvider(OrgService)
      .useValue(orgService)
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

  it('/org/branches (GET) requires authentication', () => {
    authService.getSession.mockResolvedValueOnce(null);

    return request(app.getHttpServer())
      .get('/org/branches?page=1&pageSize=10')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .expect(401);
  });

  it('/org/branches (GET) blocks non-hrms role', () => {
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
      .get('/org/branches?page=1&pageSize=10')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .expect(403);
  });

  it('/org/branches (GET) allows admin role', async () => {
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
    orgService.listBranches.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer())
      .get('/org/branches?page=1&pageSize=10')
      .set(ORG_HEADER_KEY, 'ORG-0')
      .expect(200);

    expect(orgService.listBranches).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      search: undefined,
      isActive: undefined,
    });
    expect(response.body).toEqual([]);
  });
});
