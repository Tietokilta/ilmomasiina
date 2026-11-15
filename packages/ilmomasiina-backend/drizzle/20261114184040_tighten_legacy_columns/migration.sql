-- Older versions could leave these columns empty. Fill them in before requiring a value.
-- ("defaultLanguage" is filled in by the application before this migration runs, since its
-- value comes from configuration.)
UPDATE "event" SET "openQuotaSize" = 0 WHERE "openQuotaSize" IS NULL;--> statement-breakpoint
UPDATE "signup" SET "namePublic" = false WHERE "namePublic" IS NULL;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "openQuotaSize" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "defaultLanguage" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "signup" ALTER COLUMN "namePublic" SET NOT NULL;--> statement-breakpoint
-- Versions before 3.0 saved options as [] for some questions. The API only allows null or a non-empty list.
UPDATE "question" SET "options" = NULL WHERE "options"::text = '[]';
