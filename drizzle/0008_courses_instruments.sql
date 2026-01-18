CREATE TYPE "public"."course_difficulty" AS ENUM('FOUNDATION', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_name_unique" ON "instruments" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "instruments_org_idx" ON "instruments" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "instruments_deleted_idx" ON "instruments" USING btree ("is_deleted");
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"difficulty" "course_difficulty" DEFAULT 'FOUNDATION' NOT NULL,
	"description" text,
	"instrument_id" text,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "courses_name_unique" ON "courses" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "courses_org_idx" ON "courses" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "courses_instrument_idx" ON "courses" USING btree ("instrument_id");
--> statement-breakpoint
CREATE INDEX "courses_deleted_idx" ON "courses" USING btree ("is_deleted");
--> statement-breakpoint
CREATE TABLE "course_teachers" (
	"course_id" text NOT NULL,
	"teacher_person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "course_teachers" ADD CONSTRAINT "course_teachers_teacher_person_id_people_id_fk" FOREIGN KEY ("teacher_person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "course_teachers_course_teacher_unique" ON "course_teachers" USING btree ("course_id","teacher_person_id");
--> statement-breakpoint
CREATE INDEX "course_teachers_course_idx" ON "course_teachers" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX "course_teachers_teacher_idx" ON "course_teachers" USING btree ("teacher_person_id");
