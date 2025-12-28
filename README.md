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
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_ISSUER=savant-be
BETTER_AUTH_AUDIENCE=savant-clients
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

## Auth (future)

Better Auth is not wired yet, but configuration is scaffolded in `src/auth`. Env vars are included to avoid refactors later.

## Testing

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

## Notes

- Email uniqueness is enforced at the DB level; user creation also checks for existing emails before insert.
- For soft delete + unique email behavior, consider switching to a partial unique index if you want to allow reusing an email after deletion.
