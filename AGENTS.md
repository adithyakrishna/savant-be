# AGENT GUIDELINES

## Purpose and Tone

- Provide a launch pad for any autonomous or semi-autonomous agent improving or extending this NestJS backend.
- Keep explanations precise, assumptions minimal, and behavioral changes well justified.
- Use the existing architectural patterns; resist introducing disparate visual styles or architectural motifs.
- Double-check required environment variables before running commands that touch the database, migrations, or auth subsystems.
- When documenting decisions or commenting code, aim for clarity that helps the next agent without over-explaining.

## Environment Snapshot

- Platform: macOS (darwin) on Node 20+ per pnpm ecosystem requirements; working directory is `/Users/swetha/Documents/node/savant-be`.
- Package manager: pnpm. Commands default to pnpm, but npm/yarn may work if you keep them aligned with pnpm-lock.
- Nest CLI v11 scaffolds controllers, guards, modules, and services; compiled artifacts go to `dist/` via `nest build`.
- TypeScript target: ES2023 with `module`/`moduleResolution` set to `nodenext`, `esModuleInterop` true, `strictNullChecks` enforced, `forceConsistentCasingInFileNames` enabled, and `isolatedModules`/`experimentalDecorators` true.
- Jest runs with `ts-jest` and `node --experimental-vm-modules`; shared setup in `test/jest.setup.ts`.
- Drizzle ORM drives the schema with tables defined in `src/db/schema.ts` and helpers in `src/db/db.service.ts`.

## Tooling / Setup Commands

- `pnpm install` brings dependencies in line with `pnpm-lock.yaml`; rerun when lockfile or package.json changes.
- `pnpm lint` runs ESLint over `{src,apps,libs,test}/**/*.ts` with `--fix`; keep `eslint.config.mjs` stationary with Prettier rules.
- `pnpm format` runs Prettier v3 on `src/**/*.ts` and `test/**/*.ts`; keep this handy after formatting or moving large blocks of code.
- `pnpm build` executes `nest build` and emits outputs to `dist/`; run before `pnpm start:prod` or deployments.
- `pnpm start`, `pnpm start:dev`, `pnpm start:debug`, and `pnpm start:prod` control runtime modes—use `start:dev` for hot reload and `start:debug` when stepping through flow.
- Database helpers: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:seed:super-admin` (seed script uses `dotenv` + `ts-node`).
- Better Auth helpers: `pnpm auth:generate` (Drizzle schema), `pnpm auth:secret` (prints compliant secret ≥32 chars) with CLI config in `auth.ts` at repo root.

## Run / Lint / Test Commands

- `pnpm test` runs Jest with `node --experimental-vm-modules` so the suite can handle ESM and `ts-jest` transformations.
- `pnpm test:watch` keeps Jest running; pair with `-t` to pinpoint a suite and iterate quickly.
- `pnpm test:debug` attaches `--inspect-brk` and runs `ts-node/register` plus `tsconfig-paths` for deep debugging.
- `pnpm test:cov` emits HTML/text coverage under `../coverage`; look at the HTML report for module-level detail.
- `pnpm test:e2e` runs the suite defined in `test/jest-e2e.json`; ensure the e2e database/config matches your integration environment.

## Running a Single Test

- Use `pnpm test -- <path-or-name>` to focus on files (e.g., `pnpm test -- src/students/students.controller.spec.ts`).
- Use named patterns: `pnpm test -- -t "students service"` to run matching tests.
- Pair `pnpm test:watch -- -t "pattern"` when you want live feedback while honing expectations.
- Append `--runInBand` (or use `pnpm test:debug`) for deterministic ordering or when targeting a flaky spec set.
- Remember Jest ignores `test/` by default via `testPathIgnorePatterns`; add overrides if you add integration directories under a new root.

## Import Resolution and Module Paths

- Use the `@/*` alias defined in `tsconfig.json`; prefer `import { foo } from '@/module/foo';` over deeply nested relative paths.
- Group imports by source: third-party packages first, then Nest primitives, then project aliases, each separated by a blank line.
- Keep DTO/schema imports adjacent to their consumer (e.g., controller/service pair) so validation logic stays close.
- Always import `@nestjs/*` modules before project-specific providers to maintain clarity about framework boundaries.
- Avoid default CommonJS imports; favor named imports (ESM style) unless a legacy dependency forces a default.

## Formatting / Prettier Expectations

- Prettier (v3) rules are synced via `eslint-plugin-prettier`; spacing is two spaces, trailing commas where valid, single quotes for strings unless escaping.
- Keep statements short; if an expression spans more than three lines, consider extracting helpers or introducing intermediate variables.
- Avoid nesting more than two callback levels before factoring logic into a service helper or util.
- Prefer template strings over string concatenation and align object literal keys and values vertically for readability.
- Allow lint autofixes but keep semantic changes in focus; do not rely on `eslint --fix` to rewrite heavy logic.

## Typing and TypeScript Style

- Always pair DTOs with explicit types (e.g., `CreateStudentDto`, `UpdateStudentDto`) and use `ZodValidationPipe` for runtime checks.
- Keep new types/interfaces in dedicated `*.types.ts` files alongside their module for cohesion (students, rbac, admin, db, etc.).
- Favor `ReturnType<typeof helper>` inference for internal helpers; explicitly annotate exported service/controller methods (Promise-returning when async).
- Make nullability explicit (`foo?: string | null`), especially for DTOs, to convey optional vs nullable intent clearly.
- Services should return `Promise<T>` even if synchronous today; it keeps the API ready for future I/O.

## Naming Conventions

- Classes/providers stay PascalCase (`StudentsService`, `DatabaseModule`).
- Methods/variables are camelCase; avoid underscores unless interacting with existing DB columns.
- Constants shared by modules remain UPPER_SNAKE_CASE in `*.constants.ts` files (e.g., `AUTH_COOKIE_NAME`).
- Module filenames match exported class names (`students.module.ts` exports `StudentsModule`).
- Guard and decorator names include the role or constraint they enforce (`RolesGuard`, `RequireRoles`).
- DTOs and validation schemas use descriptive action verbs (`CreateStudentDto`, `updateStudentSchema`).

## Technical Behavior Guidelines

- Throw Nest HTTP exceptions (`NotFoundException`, `BadRequestException`, `ForbiddenException`) when validation, permission, or domain rules fail.
- Surfaces errors in services and let controllers translate them; avoid catching and swallowing exceptions arbitrarily.
- Catch blocks should log context and rethrow wrapped exceptions if HTTP semantics change—don’t hide stack traces.
- Guards should short-circuit quickly with `return false`/`throw` when prerequisites aren’t met.
- Use `ZodValidationPipe` so requests hit the controller only after schema validation; extend schemas centrally when fields change.

## Testing Guidelines

- Unit tests live next to the code under `src/` with `.spec.ts` suffixes; keep them focused on one unit and mock external systems via Jest spies or `@nestjs/testing` utilities.
- Integration/e2e tests reside in `test/` and use `test/jest-e2e.json`; mimic this layout when adding new suites.
- Jest setup file (`test/jest.setup.ts`) defines shared mocks or globals; extend carefully and document new globals there.
- Keep snapshot files near the tests they represent; only update with `pnpm test -u` when expectations change intentionally.
- Prefer `test.each` or descriptive `describe` blocks to keep coverage clear when dealing with role permutations or multi-actor scenarios.

## Database and ORM

- Drizzle ORM defines tables/types in `src/db/schema.ts`; services consume them through `db.service.ts` for type-safe queries.
- Run `pnpm db:generate`/`db:migrate` after schema changes so migrations align with the compiled schema.
- Use `drizzle-kit push` only for prototyping or staging; always review the SQL before applying to production.
- Seed the super-admin with `pnpm db:seed:super-admin` after migrations—this script loads `.env` via `dotenv/config`.
- Avoid raw SQL; prefer Drizzle query builders and typed tables unless a complex statement demands a manual view.

## Auth and Sessions

- Better Auth handles auth flows; configuration lives in the repo root `auth.ts` for CLI compatibility and publishes schema into `src/auth/better-auth.schema.ts`.
- Auth controllers/services rely on JWT configuration defined via env vars; never commit secrets (.env) or share them through logs.
- Guards like `VerifiedUserGuard` and `RolesGuard` decorate endpoints requiring session info; inspect `RequestWithSession` when modifying the payload.
- Session payloads live in `AuthSession` and include nanoid IDs plus roles; they traverse through `RequestWithSession` for downstream controllers.
- When adjusting session shapes, update corresponding guards and services to avoid missing fields or undefined roles.

## Operational Notes

- Add new scripts/packages through pnpm workspaces; keep lockfile tight.
- After dependency updates, rerun lint/test as ESLint or TypeScript versions can surface new issues.
- Capture environment variable changes in `README.md` or this `AGENTS.md` so future agents know the requirements.
- Keep `node_modules` out of Git; trust `pnpm-lock.yaml` for reproducible installs.
- Distinguish between the `auth`, `admin`, and `students` modules when navigating code—each has its own DTO/guard/service hierarchy.

## Cursor and Copilot Rules

- This repository currently has no `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md`; follow the instructions in this file instead.
- If future commits add Cursor or Copilot instructions, fold them into this document so every agent benefits from a single source of truth.

## Suggested Agent Workflow

- Start with `pnpm install` to align `node_modules`; verify `pnpm-lock.yaml` matches after any dependency tweak.
- Prioritize `pnpm lint` and targeted Jest runs after touching TypeScript logic to catch type or style regressions early.
- For complex changes, run `pnpm test -- --runInBand` or `pnpm test:e2e` depending on the area impacted.
- If you touch migrations, run both `pnpm db:generate` and `pnpm db:migrate` to guarantee the schema compiles and generates accurate SQL.
- Always skim the README for domain/context (users, auth, students) before adding new behavior.

## References

- Nest entry point: `src/main.ts` and `src/app.module.ts` show module wiring and guards.
- Global config reader: `src/config/env.ts` enforces environment expectations; update it when introducing new env vars.
- DTO patterns: `src/students/students.types.ts` is a reference for pairing DTOs with Zod schemas.
- Guard/decorator pattern: `src/rbac/rbac.guard.ts` and `src/rbac/rbac.decorators.ts` demonstrate how session-based roles get enforced.
- Drizzle helpers: inspect `src/db/db.service.ts` for how connection pools/queries are built and consumed.
