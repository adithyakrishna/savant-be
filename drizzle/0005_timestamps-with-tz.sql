ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "role_assignments"
  ALTER COLUMN "created_at" TYPE timestamp with time zone;

ALTER TABLE "student_profiles"
  ALTER COLUMN "deleted_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "parent_profiles"
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "staff_profiles"
  ALTER COLUMN "deleted_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "guardianships"
  ALTER COLUMN "created_at" TYPE timestamp with time zone;

ALTER TABLE "account"
  ALTER COLUMN "access_token_expires_at" TYPE timestamp with time zone,
  ALTER COLUMN "refresh_token_expires_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "jwks"
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "expires_at" TYPE timestamp with time zone;

ALTER TABLE "session"
  ALTER COLUMN "expires_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "user"
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "verification"
  ALTER COLUMN "expires_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;

ALTER TABLE "people"
  ALTER COLUMN "deleted_at" TYPE timestamp with time zone,
  ALTER COLUMN "created_at" TYPE timestamp with time zone,
  ALTER COLUMN "updated_at" TYPE timestamp with time zone;
