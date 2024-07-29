DO $$ BEGIN
 CREATE TYPE "public"."enum_audit_action" AS ENUM('event.create', 'event.delete', 'event.publish', 'event.unpublish', 'event.edit', 'signup.queuePromote', 'signup.delete', 'signup.edit', 'user.create', 'user.delete', 'user.resetpassword', 'user.changepassword');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "quota" DROP CONSTRAINT "quota_eventId_fkey";
--> statement-breakpoint
ALTER TABLE "question" DROP CONSTRAINT "question_eventId_fkey";
--> statement-breakpoint
ALTER TABLE "answer" DROP CONSTRAINT "answer_questionId_fkey";
--> statement-breakpoint
ALTER TABLE "answer" DROP CONSTRAINT "answer_signupId_fkey";
--> statement-breakpoint
ALTER TABLE "signup" DROP CONSTRAINT "signup_quotaId_fkey";
--> statement-breakpoint
ALTER TABLE "auditlog" ALTER COLUMN "action" SET DATA TYPE enum_audit_action USING action::enum_audit_action;--> statement-breakpoint
ALTER TABLE "auditlog" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "auditlog" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "quota" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "quota" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "openQuotaSize" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "category" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "question" ALTER COLUMN "options" SET DATA TYPE jsonb USING to_jsonb(options);--> statement-breakpoint
ALTER TABLE "question" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "question" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "answer" ALTER COLUMN "answer" SET DATA TYPE jsonb USING to_jsonb(answer);--> statement-breakpoint
ALTER TABLE "answer" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "answer" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "signup" ALTER COLUMN "namePublic" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "signup" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "signup" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quota" ADD CONSTRAINT "quota_eventId_event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question" ADD CONSTRAINT "question_eventId_event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "answer" ADD CONSTRAINT "answer_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "answer" ADD CONSTRAINT "answer_signupId_signup_id_fk" FOREIGN KEY ("signupId") REFERENCES "public"."signup"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signup" ADD CONSTRAINT "signup_quotaId_quota_id_fk" FOREIGN KEY ("quotaId") REFERENCES "public"."quota"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
