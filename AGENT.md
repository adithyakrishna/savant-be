# Savant BE - Project Brief for AI

This file is a single-source briefing to understand, run, and extend the `savant-be` backend without needing other repo files.

## What this project is
- NestJS 11 backend API for user management, auth (Better Auth), and RBAC/admin provisioning.
- PostgreSQL database via Drizzle ORM.
- Drizzle migrations in `drizzle/`.
- Email/password auth with required email verification and JWT + bearer token support.

## Tech stack
- Runtime: Node.js + TypeScript (ES2023, module `nodenext`).
- Framework: NestJS 11 (`@nestjs/*`).
- DB: PostgreSQL (`pg`).
- ORM: Drizzle (`drizzle-orm`, `drizzle-kit`).
- Auth: Better Auth (`better-auth`, `@better-auth/cli`).
- Validation: Zod.
- IDs: nanoid (8 char IDs for `users` table).
- Tests: Jest + Supertest.

## Repo layout
- `src/main.ts`: Nest bootstrap, listens on `PORT`, disables default body parser.
- `src/app.module.ts`: root module imports config, DB, auth, admin, users.
- `src/config/env.ts`: env schema and validation (Zod).
- `src/db/`: Drizzle schema, db module/service, seed script.
- `src/auth/`: Better Auth config, controller, dev tooling, and stores.
- `src/rbac/`: RBAC guards/services/decorators.
- `src/users/`: users CRUD controller/service/repository/types.
- `auth.ts`: Better Auth handler for CLI compatibility.
- `drizzle/`: migrations + metadata.
- `test/`: e2e tests with in-memory users repo.
- `ACTIVE_ENDPOINTS.md`: up-to-date endpoint list.

## App flow
1) `src/main.ts` creates the Nest app and listens on `PORT` (default 3000).
2) `AppModule` loads:
   - `ConfigModule` with Zod validation (`validateEnv`).
   - `DatabaseModule` (pg Pool + Drizzle db).
   - `AuthModule` (Better Auth instance).
   - `AdminModule` (RBAC-protected provisioning).
   - `UsersModule` (CRUD for `users` table).

## Environment variables
Source of truth is `src/config/env.ts` (Zod schema), values in repo `.env`.

Required/validated env vars and defaults:
- `NODE_ENV`: `development | test | production` (default: `development`)
- `PORT`: number (default: `3000`)
- `DATABASE_URL`: required string
- `DB_POOL_MIN`: number (default: `0`)
- `DB_POOL_MAX`: number (default: `10`)
- `DB_IDLE_TIMEOUT_MS`: number (default: `30000`)
- `DB_CONN_TIMEOUT_MS`: number (default: `2000`)
- `DB_SSL`: `true|false` (default: `false`)
- `DB_LOG_QUERIES`: `true|false` (default: `false`)
- `BETTER_AUTH_BASE_URL`: optional URL (can be empty string)
- `BETTER_AUTH_BASE_PATH`: string (default: `/auth`)
- `BETTER_AUTH_SECRET`: string length >= 32
- `BETTER_AUTH_JWT_ISSUER`: string (default: `savant-be`)
- `BETTER_AUTH_JWT_AUDIENCE`: string (default: `savant-clients`)
- `BETTER_AUTH_JWT_ACCESS_TTL`: string (default: `15m`)
- Seed-only:
  - `SUPER_ADMIN_EMAIL`
  - `SUPER_ADMIN_PASSWORD` (min 8)
  - `SUPER_ADMIN_FIRST_NAME`
  - `SUPER_ADMIN_LAST_NAME`

`.env` values in this repo:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:No.1.Hacking.com@localhost:5432/savant_be
DB_POOL_MIN=0
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONN_TIMEOUT_MS=2000
DB_SSL=false
DB_LOG_QUERIES=false
BETTER_AUTH_BASE_URL=http://localhost:3000
BETTER_AUTH_BASE_PATH=/auth
BETTER_AUTH_SECRET=change-me-change-me-change-me-123456
BETTER_AUTH_JWT_ISSUER=savant-be
BETTER_AUTH_JWT_AUDIENCE=savant-clients
BETTER_AUTH_JWT_ACCESS_TTL=15m
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=ChangeMe123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

## Database schema (Drizzle)
Defined in `src/db/schema.ts` plus Better Auth tables from `src/auth/better-auth.schema.ts`.

Custom domain tables:
- `users`
  - `id` (varchar(8) primary key, generated via nanoid)
  - `name` (text, required)
  - `email` (text, nullable)
  - `deleted` (boolean, default false)
  - `created_at`, `updated_at` (timestamps)
  - Unique partial index `users_email_unique` on `email` where `deleted = false`
- `role_assignments`
  - `id` (text PK), `user_id` (FK to `user.id`), `role`, `scope_id`
  - Unique index on `(user_id, role, scope_id)`
  - Indexes on `role`, `scope_id`, `user_id`
- `student_profiles`
  - `person_id` (PK, FK to `people.id`)
  - Optional profile fields, soft delete fields, timestamps
- `parent_profiles`
  - `person_id` (PK, FK to `people.id`), timestamps
- `staff_profiles`
  - `person_id` (PK, FK to `people.id`), `bio`, `active`, soft delete fields, timestamps
- `guardianships`
  - `id` (PK)
  - `student_person_id` + `parent_person_id` (FK to `people.id`)
  - Unique index on `(student_person_id, parent_person_id)`

Better Auth tables (from `src/auth/better-auth.schema.ts`):
- `people`: person profile and contact details, `is_deleted` + timestamps, partial unique email index.
- `user`: Better Auth user record; `email` unique; optional `person_id` FK to `people`.
- `session`, `account`, `verification`, `jwks`: standard Better Auth tables.

Migrations live in `drizzle/` with metadata in `drizzle/meta/`.

## Database access
`DatabaseModule` builds a `pg` Pool using env values and exports a Drizzle db instance.
`DatabaseService` closes the pool on module destroy.

## Auth (Better Auth)
Primary config: `src/auth/better-auth.config.ts`.
Key settings:
- Mounted at `BETTER_AUTH_BASE_PATH` (default `/auth`).
- `emailAndPassword` enabled, sign-up disabled, email verification required.
- JWT plugin:
  - issuer/audience/TTL from env.
  - JWT payload includes `role` from `user.role` if present, else `user`.
- Bearer token plugin enabled.
- Disabled path: `/send-verification-email`.
Token handling for dev/test:
- Verification tokens are stored in-memory (`src/auth/verification-token.store.ts`).
- Password reset tokens stored in-memory (`src/auth/password-reset-token.store.ts`).

Mounting:
- `AuthController` uses `@All('*path')` to pass through to Better Auth handler.
- `auth.ts` at repo root exports the handler for CLI compatibility.

Auth dev endpoint:
- `GET /auth-dev/verification-code?email=...` reads from in-memory token store.

## RBAC
Roles (`src/rbac/rbac.types.ts`):
`SUPER_ADMIN`, `ADMIN`, `STAFF`, `TEACHER`, `STUDENT`, `PARENT`, `PENDING`.
Default scope is `GLOBAL`.

Guards:
- `VerifiedUserGuard`: ensures session exists and email is verified.
- `RolesGuard`: checks required role(s) via metadata set by `@RequireRoles`.

`RbacService`:
- Loads roles from `role_assignments`.
- `canProvisionRole` allows:
  - `SUPER_ADMIN` => all roles.
  - `ADMIN` => all except `SUPER_ADMIN`.

## Admin provisioning
Endpoints in `src/admin/admin.controller.ts`, logic in `src/admin/admin.service.ts`.
`POST /admin/provision-user`:
- Requires verified session + role `SUPER_ADMIN` or `ADMIN`.
- Loads person from `people` by `personId` and not deleted.
- Ensures email matches person record if provided.
- Creates Better Auth user with random password.
- Links to `people` record and sets email if missing.
- For `STUDENT`:
  - inserts `student_profiles`
  - assigns `STUDENT` role only
  - triggers password reset email flow using Better Auth API
- For other roles:
  - assigns requested role + `PENDING`
- Issues email verification token.

`GET /admin/students`:
- Requires verified session + `SUPER_ADMIN` or `ADMIN`.
- Returns students in `GLOBAL` scope and not deleted.

## Users module
CRUD for `users` table (separate from Better Auth `user` table).

Behavior highlights:
- `id` is nanoid(8), generated with uniqueness check (up to 5 attempts).
- Email is normalized (trim + lowercase, empty string -> null).
- Email uniqueness enforced in code + DB partial index.
- Soft delete sets `deleted=true`; hard delete removes row.

## HTTP endpoints
See `ACTIVE_ENDPOINTS.md` for complete list. Highlights:
- `GET /` health check.
- `/users` CRUD endpoints.
- `/admin/*` provisioning and student listing.
- `/auth/*` Better Auth endpoints.
- `/auth-dev/verification-code` dev-only endpoint.

## Scripts (package.json)
- `pnpm start`, `pnpm start:dev`, `pnpm start:prod`
- `pnpm build`
- `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`
- `pnpm auth:generate`, `pnpm auth:secret`
- `pnpm db:seed:super-admin`
- `pnpm test`, `pnpm test:e2e`, `pnpm test:cov`
- `pnpm lint`, `pnpm format`

## Seed script
`src/db/seed-super-admin.ts`:
- Requires `SUPER_ADMIN_*` env vars.
- Upserts a `people` row (email + name).
- Creates/updates Better Auth `user` with verified email and credential account.
- Adds `SUPER_ADMIN` role assignment in `GLOBAL` scope.

## Tests
`test/app.e2e-spec.ts`:
- Uses Nest testing module with overridden `UsersRepository` (in-memory).
- Overrides `AUTH_INSTANCE` with `{}` to avoid Better Auth.
- Verifies health endpoint and users CRUD behavior.

## TypeScript config
`tsconfig.json`:
- Module: `nodenext`, target `ES2023`.
- Path alias: `@/*` -> `src/*`.
- Emits declarations; `outDir` is `dist`.

