DROP INDEX IF EXISTS "people_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "people_email_unique" ON "people" USING btree ("email") WHERE "people"."is_deleted" = false;--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_person_id_people_id_fk";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
