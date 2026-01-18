CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_name_unique" ON "orgs" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_code_unique" ON "orgs" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "orgs_active_idx" ON "orgs" USING btree ("is_active");
--> statement-breakpoint
INSERT INTO "orgs" ("id", "name", "code", "is_active", "created_at", "updated_at")
VALUES ('ORG-0', 'Default Org', 'ORG-0', true, now(), now())
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "employee_org_assignments" ADD COLUMN "org_id" text;
--> statement-breakpoint
UPDATE "employee_org_assignments" SET "org_id" = 'ORG-0' WHERE "org_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "employee_org_assignments" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "employee_org_assignments" ADD CONSTRAINT "employee_org_assignments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "employee_org_assignments_org_idx" ON "employee_org_assignments" USING btree ("org_id");
--> statement-breakpoint
CREATE TYPE "public"."attendance_week_start" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
--> statement-breakpoint
CREATE TABLE "attendance_settings" (
	"org_id" text PRIMARY KEY NOT NULL,
	"period_days" integer DEFAULT 7 NOT NULL,
	"week_start" "attendance_week_start" DEFAULT 'TUESDAY' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "attendance_settings_week_idx" ON "attendance_settings" USING btree ("week_start");
--> statement-breakpoint
ALTER TABLE "attendance_daily_summaries" RENAME TO "attendance_periodic_summaries";
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ADD COLUMN "org_id" text;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ADD COLUMN "period_start" date;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ADD COLUMN "period_end" date;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ADD COLUMN "period_days" integer;
--> statement-breakpoint
UPDATE "attendance_periodic_summaries"
SET "org_id" = 'ORG-0',
    "period_start" = "summary_date",
    "period_end" = "summary_date",
    "period_days" = 1
WHERE "period_start" IS NULL;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ALTER COLUMN "period_start" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ALTER COLUMN "period_end" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ALTER COLUMN "period_days" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" DROP COLUMN "summary_date";
--> statement-breakpoint
ALTER TABLE "attendance_periodic_summaries" ADD CONSTRAINT "attendance_periodic_summaries_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "attendance_daily_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "attendance_daily_date_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_periodic_unique" ON "attendance_periodic_summaries" USING btree ("person_id","org_id","period_start");
--> statement-breakpoint
CREATE INDEX "attendance_periodic_org_start_idx" ON "attendance_periodic_summaries" USING btree ("org_id","period_start");
