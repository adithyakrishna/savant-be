# Active Endpoints

Base URL: `http://localhost:<PORT>` where `<PORT>` defaults to `3000`.

## App

1) `GET /`
   - Returns health status.
   - Example:
     ```bash
     curl http://localhost:3000/
     ```

## Users

1) `GET /users`
   - Query params:
     - `includeDeleted` (optional, `true|false`)
   - Example:
     ```bash
     curl "http://localhost:3000/users?includeDeleted=false"
     ```

2) `GET /users/:id`
   - Path params:
     - `id` (string)
   - Example:
     ```bash
     curl http://localhost:3000/users/abc12345
     ```

3) `POST /users`
   - Body (JSON):
     - `name` (string, required)
     - `email` (string | null, optional; empty string is treated as null)
   - Example:
     ```bash
     curl -X POST http://localhost:3000/users \
       -H "Content-Type: application/json" \
       -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
     ```

4) `PATCH /users/:id`
   - Path params:
     - `id` (string)
   - Body (JSON):
     - `name` (string, optional)
     - `email` (string | null, optional; empty string is treated as null)
   - Example:
     ```bash
     curl -X PATCH http://localhost:3000/users/abc12345 \
       -H "Content-Type: application/json" \
       -d '{"name":"Ada Byron"}'
     ```

5) `DELETE /users/:id`
   - Path params:
     - `id` (string)
   - Query params:
     - `hard` (optional, `true|false`)
   - Example:
     ```bash
     curl -X DELETE "http://localhost:3000/users/abc12345?hard=false"
     ```

## Admin

1) `POST /admin/provision-user`
   - Requires verified user session with `SUPER_ADMIN` or `ADMIN` role.
   - Super admins can provision all roles except `SUPER_ADMIN` (seed-only).
   - Admins can provision all roles except `SUPER_ADMIN`.
   - Body (JSON):
     - `personId` (string, required)
     - `email` (string, optional; must match person email if set)
     - `emailVerificationCallbackURL` (string, optional)
     - `passwordResetRedirectTo` (string, optional; required when provisioning `STUDENT`)
     - `role` (enum, required: `ADMIN | STAFF | TEACHER | STUDENT | PARENT`)
     - `scopeId` (string, optional; default `GLOBAL`)
   - Example (cookie session):
     ```bash
     curl -X POST http://localhost:3000/admin/provision-user \
       -H "Content-Type: application/json" \
       --cookie "better-auth.session=<session-cookie>" \
       -d '{"personId":"person_123","role":"STUDENT","scopeId":"GLOBAL"}'
     ```
   - Example (bearer token):
     ```bash
     curl -X POST http://localhost:3000/admin/provision-user \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <access-token>" \
       -d '{"personId":"person_123","role":"STUDENT"}'
     ```

2) `GET /admin/students`
   - Requires verified user session with `SUPER_ADMIN` or `ADMIN` role.
   - Returns students linked to the `people` table for the `GLOBAL` scope.
   - Example:
     ```bash
     curl http://localhost:3000/admin/students \
       -H "Authorization: Bearer <access-token>"
     ```

## Auth (Better Auth)

Auth endpoints are mounted under `BETTER_AUTH_BASE_PATH` (default: `/auth`).

1) `POST /auth/sign-up/email`
   - Disabled (all sign-up requests are rejected).

2) `POST /auth/sign-in/email`
   - Body (JSON):
     - `email` (string, required)
     - `password` (string, required)
     - `callbackURL` (string, optional)
     - `rememberMe` (boolean, optional)
   - Example:
     ```bash
     curl -X POST http://localhost:3000/auth/sign-in/email \
       -H "Content-Type: application/json" \
       -d '{"email":"ada@example.com","password":"StrongPass123!"}'
     ```

3) `GET /auth/verify-email`
   - Query params:
     - `token` (string, required)
     - `callbackURL` (string, optional)
   - Example:
     ```bash
     curl "http://localhost:3000/auth/verify-email?token=<token>"
     ```

4) `POST /auth/sign-out`
   - Requires auth cookie or `Authorization: Bearer <token>` header.
   - Example:
     ```bash
     curl -X POST http://localhost:3000/auth/sign-out \
       -H "Authorization: Bearer <access-token>"
     ```

5) `GET /auth/get-session`
   - Query params:
     - `disableCookieCache` (optional, boolean)
     - `disableRefresh` (optional, boolean)
   - Requires auth cookie or `Authorization: Bearer <token>` header.
   - Example:
     ```bash
     curl http://localhost:3000/auth/get-session \
       -H "Authorization: Bearer <access-token>"
     ```

6) `POST /auth/request-password-reset`
   - Body (JSON):
     - `email` (string, required)
     - `redirectTo` (string, optional)

7) `GET /auth/reset-password/:token`
   - Path params:
     - `token` (string, required)
   - Query params:
     - `callbackURL` (string, required)

8) `POST /auth/reset-password`
   - Body (JSON):
     - `newPassword` (string, required)
     - `token` (string, required; can also be sent via query)

9) `POST /auth/update-user`
    - Body (JSON):
      - `name` (string, optional)
      - `image` (string | null, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

10) `POST /auth/change-password`
    - Body (JSON):
      - `currentPassword` (string, required)
      - `newPassword` (string, required)
      - `revokeOtherSessions` (boolean, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

11) `POST /auth/set-password`
    - Body (JSON):
      - `newPassword` (string, required)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

12) `POST /auth/delete-user`
    - Body (JSON):
      - `password` (string, optional)
      - `token` (string, optional)
      - `callbackURL` (string, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

13) `GET /auth/delete-user/callback`
    - Query params:
      - `token` (string, required)
      - `callbackURL` (string, optional)

14) `POST /auth/change-email`
    - Body (JSON):
      - `newEmail` (string, required)
      - `callbackURL` (string, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

15) `GET /auth/list-sessions`
    - Requires auth cookie or `Authorization: Bearer <token>` header.

16) `POST /auth/revoke-session`
    - Body (JSON):
      - `token` (string, required)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

17) `POST /auth/revoke-sessions`
    - Requires auth cookie or `Authorization: Bearer <token>` header.

18) `POST /auth/revoke-other-sessions`
    - Requires auth cookie or `Authorization: Bearer <token>` header.

19) `GET /auth/list-accounts`
    - Requires auth cookie or `Authorization: Bearer <token>` header.

20) `POST /auth/link-social`
    - Body (JSON):
      - `provider` (string, required)
      - `callbackURL` (string, optional)
      - `disableRedirect` (boolean, optional)
      - `idToken` (object, optional)
      - `requestSignUp` (boolean, optional)
      - `scopes` (string[], optional)
      - `errorCallbackURL` (string, optional)
      - `additionalData` (object, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

21) `POST /auth/unlink-account`
    - Body (JSON):
      - `providerId` (string, required)
      - `accountId` (string, optional)
    - Requires auth cookie or `Authorization: Bearer <token>` header.

22) `POST /auth/get-access-token`
    - Body (JSON):
      - `providerId` (string, required)
      - `accountId` (string, optional)
      - `userId` (string, optional)

23) `POST /auth/refresh-token`
    - Body (JSON):
      - `providerId` (string, required)
      - `accountId` (string, optional)
      - `userId` (string, optional)

24) `GET /auth/account-info`
    - Requires auth cookie or `Authorization: Bearer <token>` header.

25) `POST /auth/sign-in/social`
    - Body (JSON):
      - `provider` (string, required)
      - `callbackURL` (string, optional)
      - `newUserCallbackURL` (string, optional)
      - `errorCallbackURL` (string, optional)
      - `disableRedirect` (boolean, optional)
      - `idToken` (object, optional)
      - `scopes` (string[], optional)
      - `requestSignUp` (boolean, optional)
      - `loginHint` (string, optional)
      - `additionalData` (object, optional)

26) `GET /auth/callback/:provider`
    - Path params:
      - `provider` (string, required)
    - Query params:
      - OAuth provider callback query params (e.g. `code`, `state`, `error`)

## Auth Dev

1) `GET /auth-dev/verification-code`
   - Query params:
     - `email` (string, required)
   - Returns the latest verification token captured for that email.
   - Example:
     ```bash
     curl "http://localhost:3000/auth-dev/verification-code?email=ada@example.com"
     ```
