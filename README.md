# Savant BE

Backend API built with NestJS, PostgreSQL, and Drizzle ORM. Users are stored in Postgres with nanoid-based primary keys (8 chars), soft deletes, and a unique email constraint. The project includes migration tooling and environment validation.

## Stack

- NestJS 11
- PostgreSQL
- Drizzle ORM + drizzle-kit
- Zod for env validation
- nanoid for ID generation

## Getting started

```bash
pnpm install
```

Create a `.env` file (already present in this repo) and update values as needed:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://savant:temporary_password@localhost:5432/savant
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
```

## Database

Schema lives in `src/db/schema.ts`. Users have:

- `id`: nanoid(8) primary key
- `email`: unique index at the DB level
- `deleted`: soft delete flag
- `created_at` and `updated_at` timestamps

Generate and apply migrations:

```bash
pnpm db:generate
pnpm db:push
```

## Better Auth

Better Auth is wired with the Drizzle adapter and JWT plugin. The auth handler is mounted at `/auth` and uses the configuration in `auth.ts` (root) for CLI compatibility.

Generate the Better Auth schema for Drizzle:

```bash
pnpm auth:generate
```

Auth endpoints (served by Better Auth):

- `POST /auth/sign-up/email`
- `POST /auth/sign-in/email`
- `POST /auth/sign-out`
- `GET /auth/jwks`
- `GET /auth/token`

Note: `BETTER_AUTH_SECRET` must be at least 32 characters. You can generate one with `pnpm auth:secret`.

## Running the app

```bash
pnpm start
pnpm start:dev
pnpm start:prod
```

## API overview

Base URL: `http://localhost:3000`

- `GET /` -> health check
- `GET /users` -> list users (excludes soft deleted)
- `GET /users?includeDeleted=true` -> include soft deleted
- `GET /users/:id` -> fetch a user by id
- `POST /users` -> create user
- `PATCH /users/:id` -> update user
- `DELETE /users/:id` -> soft delete by default
- `DELETE /users/:id?hard=true` -> hard delete

## Auth

Better Auth is wired in `src/auth` and mounted at `/auth` via the Nest controller. Env vars in `.env` configure the handler and JWT plugin.

## Testing

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

## Notes

- Email uniqueness is enforced at the DB level; user creation also checks for existing emails before insert.
- For soft delete + unique email behavior, consider switching to a partial unique index if you want to allow reusing an email after deletion.
