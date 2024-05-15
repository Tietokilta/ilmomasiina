-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

DO $$ BEGIN
 CREATE TYPE "public"."enum_question_type" AS ENUM('text', 'textarea', 'number', 'select', 'checkbox');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."enum_signup_status" AS ENUM('in-quota', 'in-open', 'in-queue');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
	"name" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditlog" (
	"id" serial PRIMARY KEY NOT NULL,
	"user" varchar(255),
	"ipAddress" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"eventId" char(12),
	"eventName" varchar(255),
	"signupId" char(12),
	"signupName" varchar(255),
	"extra" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quota" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"eventId" char(12) NOT NULL,
	"order" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"size" integer,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"date" timestamp with time zone,
	"registrationStartDate" timestamp with time zone,
	"registrationEndDate" timestamp with time zone,
	"openQuotaSize" integer DEFAULT 0,
	"description" text,
	"price" varchar(255),
	"location" varchar(255),
	"facebookUrl" varchar(255),
	"webpageUrl" varchar(255),
	"category" varchar(255) DEFAULT ''::character varying NOT NULL,
	"draft" boolean DEFAULT true NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"signupsPublic" boolean DEFAULT false NOT NULL,
	"nameQuestion" boolean DEFAULT true NOT NULL,
	"emailQuestion" boolean DEFAULT true NOT NULL,
	"verificationEmail" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone,
	"endDate" timestamp with time zone,
	CONSTRAINT "event_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "question" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"eventId" char(12) NOT NULL,
	"order" integer NOT NULL,
	"question" varchar(255) NOT NULL,
	"type" "enum_question_type" NOT NULL,
	"options" varchar(255),
	"required" boolean DEFAULT true NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "answer" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionId" char(12) NOT NULL,
	"signupId" char(12) NOT NULL,
	"answer" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signup" (
	"id" char(12) PRIMARY KEY NOT NULL,
	"quotaId" char(12) NOT NULL,
	"firstName" varchar(255),
	"lastName" varchar(255),
	"namePublic" boolean DEFAULT false,
	"email" varchar(255),
	"confirmedAt" timestamp with time zone,
	"status" "enum_signup_status",
	"position" integer,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone,
	"language" varchar(8)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quota" ADD CONSTRAINT "quota_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question" ADD CONSTRAINT "question_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "answer" ADD CONSTRAINT "answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "answer" ADD CONSTRAINT "answer_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "public"."signup"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signup" ADD CONSTRAINT "signup_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "public"."quota"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quota_main" ON "quota" ("eventId","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_answer_main" ON "answer" ("questionId","signupId","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signup_main" ON "signup" ("quotaId","confirmedAt","createdAt","deletedAt");
