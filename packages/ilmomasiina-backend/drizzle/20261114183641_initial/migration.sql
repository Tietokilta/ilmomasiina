CREATE TYPE "enum_signup_manualPaymentStatus" AS ENUM('paid', 'refunded');--> statement-breakpoint
CREATE TYPE "enum_event_payments" AS ENUM('disabled', 'manual', 'online');--> statement-breakpoint
CREATE TYPE "enum_payment_status" AS ENUM('creating', 'pending', 'paid', 'expired', 'creation_failed', 'refunded');--> statement-breakpoint
CREATE TYPE "enum_question_type" AS ENUM('text', 'textarea', 'number', 'select', 'checkbox');--> statement-breakpoint
CREATE TYPE "enum_signup_status" AS ENUM('in-quota', 'in-open', 'in-queue');--> statement-breakpoint
CREATE TABLE "answer" (
	"id" serial PRIMARY KEY,
	"questionId" char(12) NOT NULL,
	"signupId" char(12) NOT NULL,
	"answer" json NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auditlog" (
	"id" serial PRIMARY KEY,
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
CREATE TABLE "event" (
	"id" char(12) PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL CONSTRAINT "event_slug_key" UNIQUE,
	"date" timestamp with time zone,
	"registrationStartDate" timestamp with time zone,
	"registrationEndDate" timestamp with time zone,
	"openQuotaSize" integer DEFAULT 0,
	"description" text,
	"price" varchar(255),
	"location" varchar(255),
	"facebookUrl" varchar(255),
	"webpageUrl" varchar(255),
	"category" varchar(255) DEFAULT '' NOT NULL,
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
	"languages" json DEFAULT '{}' NOT NULL,
	"defaultLanguage" varchar(8),
	"payments" "enum_event_payments" DEFAULT 'disabled'::"enum_event_payments" NOT NULL,
	"preferredFrontend" varchar(255) DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY,
	"signupId" varchar(255) NOT NULL,
	"stripeCheckoutSessionId" varchar(255) CONSTRAINT "payment_stripeCheckoutSessionId_key" UNIQUE,
	"status" "enum_payment_status" DEFAULT 'creating'::"enum_payment_status" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"products" json NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_status_stripeCheckoutSessionId_ck" CHECK (("status" IN ('pending', 'paid', 'expired', 'refunded') AND "stripeCheckoutSessionId" IS NOT NULL) OR ("status" NOT IN ('pending', 'paid', 'expired', 'refunded') AND "stripeCheckoutSessionId" IS NULL)),
	CONSTRAINT "payment_status_completedAt_ck" CHECK (("status" IN ('paid', 'refunded') AND "completedAt" IS NOT NULL) OR ("status" NOT IN ('paid', 'refunded') AND "completedAt" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" char(12) PRIMARY KEY,
	"eventId" char(12) NOT NULL,
	"order" integer NOT NULL,
	"question" varchar(255) NOT NULL,
	"type" "enum_question_type" NOT NULL,
	"options" json,
	"required" boolean DEFAULT true NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone,
	"prices" json
);
--> statement-breakpoint
CREATE TABLE "quota" (
	"id" char(12) PRIMARY KEY,
	"eventId" char(12) NOT NULL,
	"order" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"size" integer,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"deletedAt" timestamp with time zone,
	"price" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup" (
	"id" char(12) PRIMARY KEY,
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
	"language" varchar(8),
	"price" integer,
	"currency" varchar(8),
	"products" json,
	"manualPaymentStatus" "enum_signup_manualPaymentStatus"
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL CONSTRAINT "user_email_key" UNIQUE,
	"password" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_answer_main" ON "answer" ("signupId","questionId","deletedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_active_key" ON "payment" ("signupId") WHERE "status" IN ('creating', 'pending', 'paid');--> statement-breakpoint
CREATE INDEX "idx_quota_main" ON "quota" ("eventId","deletedAt");--> statement-breakpoint
CREATE INDEX "idx_signup_main" ON "signup" ("quotaId","deletedAt","confirmedAt","createdAt");--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "signup"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "signup"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "quota" ADD CONSTRAINT "quota_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "signup" ADD CONSTRAINT "signup_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
-- Payments must never be deleted, and most of their fields must never change.
-- Drizzle can't express triggers in the schema, so they are maintained by hand here.
CREATE FUNCTION "payment_prevent_delete_fn"() RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'Deletion of payments is not allowed.';
  END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_prevent_delete" BEFORE DELETE OR TRUNCATE ON "payment" FOR EACH STATEMENT EXECUTE FUNCTION "payment_prevent_delete_fn"();--> statement-breakpoint
CREATE FUNCTION "payment_immutable_fn"() RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'These payment fields cannot be updated.';
  END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_immutable" BEFORE UPDATE OF "id", "signupId", "amount", "currency", "products", "expiresAt", "createdAt" ON "payment" FOR EACH ROW EXECUTE FUNCTION "payment_immutable_fn"();--> statement-breakpoint
CREATE FUNCTION "payment_session_id_set_once_fn"() RETURNS TRIGGER AS $$
  BEGIN
    IF OLD."stripeCheckoutSessionId" IS NULL AND NEW."stripeCheckoutSessionId" IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'stripeCheckoutSessionId can only be set once.';
  END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_session_id_set_once" BEFORE UPDATE OF "stripeCheckoutSessionId" ON "payment" FOR EACH ROW EXECUTE FUNCTION "payment_session_id_set_once_fn"();--> statement-breakpoint
CREATE FUNCTION "payment_completed_at_set_once_fn"() RETURNS TRIGGER AS $$
  BEGIN
    IF OLD."completedAt" IS NULL AND NEW."completedAt" IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'completedAt can only be set once.';
  END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_completed_at_set_once" BEFORE UPDATE OF "completedAt" ON "payment" FOR EACH ROW EXECUTE FUNCTION "payment_completed_at_set_once_fn"();--> statement-breakpoint
-- Valid transitions:
--   creating -> pending (Stripe accepts session)
--   creating -> creation_failed (Stripe rejects)
--   pending -> paid (webhook or return URL confirmation)
--   pending -> expired (webhook or session check)
--   paid -> refunded (admin-initiated refund)
CREATE FUNCTION "payment_validate_update_fn"() RETURNS TRIGGER AS $$
  BEGIN
    IF OLD."status" = NEW."status" THEN
      RETURN NEW;
    END IF;
    IF OLD."status" = 'creating' AND NEW."status" IN ('pending', 'creation_failed') THEN
      RETURN NEW;
    END IF;
    IF OLD."status" = 'pending' AND NEW."status" IN ('paid', 'expired') THEN
      RETURN NEW;
    END IF;
    IF OLD."status" = 'paid' AND NEW."status" = 'refunded' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Invalid payment status transition from % to %', OLD."status", NEW."status";
  END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_validate_update" BEFORE UPDATE ON "payment" FOR EACH ROW EXECUTE FUNCTION "payment_validate_update_fn"();
