import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  AuditEvent,
  ManualPaymentStatus,
  PaymentMode,
  PaymentStatus,
  ProductSchema,
  QuestionType,
  SignupStatus,
} from "@tietokilta/ilmomasiina-models";
import type { QuestionLanguage, QuotaLanguage } from "@tietokilta/ilmomasiina-models/dist/schema";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";

// The table, column, constraint and enum names here match the schema created by the Sequelize
// migrations of Ilmomasiina 2.x/3.0-alpha, so that existing databases keep working.

interface EventPerLanguageAttributes {
  title: string;
  description: string | null;
  price: string | null;
  location: string | null;
  webpageUrl: string | null;
  facebookUrl: string | null;
  verificationEmail: string | null;
}

export interface EventLanguage extends EventPerLanguageAttributes {
  quotas: QuotaLanguage[];
  questions: QuestionLanguage[];
}

// IDs are stored as CHAR(12), which Postgres pads with spaces. IDs from old installations can be
// shorter than that, so strip the padding when reading. Comparisons on CHAR columns ignore it anyway.
const id = customType<{ data: string; driverData: string }>({
  dataType: () => `char(${RANDOM_ID_LENGTH})`,
  fromDriver: (value) => value.trimEnd(),
});
const date = () => timestamp({ withTimezone: true });

/** `createdAt` and `updatedAt`, maintained by the application like Sequelize did. */
const timestamps = {
  createdAt: date()
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: date()
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

/** `deletedAt` for soft-deleted ("paranoid") tables. */
const softDelete = {
  deletedAt: date(),
};

export const paymentModeEnum = pgEnum("enum_event_payments", PaymentMode);
export const paymentStatusEnum = pgEnum("enum_payment_status", PaymentStatus);
export const questionTypeEnum = pgEnum("enum_question_type", QuestionType);
export const manualPaymentStatusEnum = pgEnum("enum_signup_manualPaymentStatus", ManualPaymentStatus);
export const signupStatusEnum = pgEnum("enum_signup_status", SignupStatus);

export const eventTable = pgTable("event", {
  id: id().primaryKey().$defaultFn(generateRandomId),
  title: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique("event_slug_key"),
  date: date(),
  registrationStartDate: date(),
  registrationEndDate: date(),
  openQuotaSize: integer().notNull().default(0),
  description: text(),
  price: varchar({ length: 255 }),
  location: varchar({ length: 255 }),
  facebookUrl: varchar({ length: 255 }),
  webpageUrl: varchar({ length: 255 }),
  category: varchar({ length: 255 }).notNull().default(""),
  draft: boolean().notNull().default(true),
  listed: boolean().notNull().default(true),
  signupsPublic: boolean().notNull().default(false),
  nameQuestion: boolean().notNull().default(true),
  emailQuestion: boolean().notNull().default(true),
  verificationEmail: text(),
  ...timestamps,
  ...softDelete,
  endDate: date(),
  languages: json().$type<Record<string, EventLanguage>>().notNull().default({}),
  defaultLanguage: varchar({ length: 8 }).notNull(),
  payments: paymentModeEnum().notNull().default(PaymentMode.DISABLED),
  preferredFrontend: varchar({ length: 255 }).notNull().default("default"),
});

export const quotaTable = pgTable(
  "quota",
  {
    id: id().primaryKey().$defaultFn(generateRandomId),
    eventId: id().notNull(),
    order: integer().notNull(),
    title: varchar({ length: 255 }).notNull(),
    size: integer(),
    ...timestamps,
    ...softDelete,
    price: integer().notNull().default(0),
  },
  (t) => [
    foreignKey({ name: "quota_eventId_fkey", columns: [t.eventId], foreignColumns: [eventTable.id] })
      .onUpdate("cascade")
      .onDelete("cascade"),
    index("idx_quota_main").on(t.eventId, t.deletedAt),
  ],
);

export const questionTable = pgTable(
  "question",
  {
    id: id().primaryKey().$defaultFn(generateRandomId),
    eventId: id().notNull(),
    order: integer().notNull(),
    question: varchar({ length: 255 }).notNull(),
    type: questionTypeEnum().notNull(),
    options: json().$type<string[]>(),
    required: boolean().notNull().default(true),
    public: boolean().notNull().default(false),
    ...timestamps,
    ...softDelete,
    prices: json().$type<number[]>(),
  },
  (t) => [
    foreignKey({ name: "question_eventId_fkey", columns: [t.eventId], foreignColumns: [eventTable.id] })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const signupTable = pgTable(
  "signup",
  {
    id: id().primaryKey().$defaultFn(generateRandomId),
    quotaId: id().notNull(),
    firstName: varchar({ length: 255 }),
    lastName: varchar({ length: 255 }),
    namePublic: boolean().notNull().default(false),
    email: varchar({ length: 255 }),
    confirmedAt: date(),
    status: signupStatusEnum(),
    position: integer(),
    ...timestamps,
    ...softDelete,
    language: varchar({ length: 8 }),
    /** Total price of the signup in cents, calculated when it was last updated. */
    price: integer(),
    /** The currency in which the price is denominated. */
    currency: varchar({ length: 8 }),
    /** The product lines used to calculate the price. */
    products: json().$type<ProductSchema[]>(),
    /** Payment status set manually by an admin, without creating a Payment record. */
    manualPaymentStatus: manualPaymentStatusEnum(),
  },
  (t) => [
    foreignKey({ name: "signup_quotaId_fkey", columns: [t.quotaId], foreignColumns: [quotaTable.id] })
      .onUpdate("cascade")
      .onDelete("cascade"),
    index("idx_signup_main").on(t.quotaId, t.deletedAt, t.confirmedAt, t.createdAt),
  ],
);

export const answerTable = pgTable(
  "answer",
  {
    id: serial().primaryKey(),
    questionId: id().notNull(),
    signupId: id().notNull(),
    answer: json().$type<string | string[]>().notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    foreignKey({ name: "answer_questionId_fkey", columns: [t.questionId], foreignColumns: [questionTable.id] })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({ name: "answer_signupId_fkey", columns: [t.signupId], foreignColumns: [signupTable.id] })
      .onUpdate("cascade")
      .onDelete("cascade"),
    index("idx_answer_main").on(t.signupId, t.questionId, t.deletedAt),
  ],
);

const SESSION_STATUSES = sql.raw(
  [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.EXPIRED, PaymentStatus.REFUNDED]
    .map((status) => `'${status}'`)
    .join(", "),
);
const COMPLETED_STATUSES = sql.raw(
  [PaymentStatus.PAID, PaymentStatus.REFUNDED].map((status) => `'${status}'`).join(", "),
);
/** Statuses of payments that are still relevant, i.e. not failed or expired. */
export const ACTIVE_PAYMENT_STATUSES = [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID];
const ACTIVE_STATUSES = sql.raw(ACTIVE_PAYMENT_STATUSES.map((status) => `'${status}'`).join(", "));

// Deleting payments and changing most of their fields is additionally prevented by triggers,
// which are created in the initial migration.
export const paymentTable = pgTable(
  "payment",
  {
    id: serial().primaryKey(),
    signupId: varchar({ length: 255 }).notNull(),
    stripeCheckoutSessionId: varchar({ length: 255 }).unique("payment_stripeCheckoutSessionId_key"),
    status: paymentStatusEnum().notNull().default(PaymentStatus.CREATING),
    amount: integer().notNull(),
    currency: varchar({ length: 8 }).notNull(),
    products: json().$type<ProductSchema[]>().notNull(),
    expiresAt: date().notNull(),
    completedAt: date(),
    ...timestamps,
  },
  (t) => [
    // Signups with payments should never be deleted.
    foreignKey({ name: "payment_signupId_fkey", columns: [t.signupId], foreignColumns: [signupTable.id] })
      .onUpdate("restrict")
      .onDelete("restrict"),
    // Only one active payment per signup.
    uniqueIndex("payment_active_key")
      .on(t.signupId)
      .where(sql`${t.status} IN (${ACTIVE_STATUSES})`),
    // stripeCheckoutSessionId is set if and only if the status requires it.
    check(
      "payment_status_stripeCheckoutSessionId_ck",
      sql`(${t.status} IN (${SESSION_STATUSES}) AND ${t.stripeCheckoutSessionId} IS NOT NULL) OR (${t.status} NOT IN (${SESSION_STATUSES}) AND ${t.stripeCheckoutSessionId} IS NULL)`,
    ),
    // completedAt is set if and only if the payment is paid or refunded.
    check(
      "payment_status_completedAt_ck",
      sql`(${t.status} IN (${COMPLETED_STATUSES}) AND ${t.completedAt} IS NOT NULL) OR (${t.status} NOT IN (${COMPLETED_STATUSES}) AND ${t.completedAt} IS NULL)`,
    ),
  ],
);

export const userTable = pgTable("user", {
  id: serial().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique("user_email_key"),
  password: varchar({ length: 255 }).notNull(),
  ...timestamps,
});

export const auditLogTable = pgTable("auditlog", {
  id: serial().primaryKey(),
  user: varchar({ length: 255 }),
  ipAddress: varchar({ length: 64 }).notNull(),
  action: varchar({ length: 32 }).$type<AuditEvent>().notNull(),
  eventId: id(),
  eventName: varchar({ length: 255 }),
  signupId: id(),
  signupName: varchar({ length: 255 }),
  extra: text(),
  ...timestamps,
});

/** All tables, keyed by the names used for `db.query` and relations. */
export const schema = {
  event: eventTable,
  quota: quotaTable,
  question: questionTable,
  signup: signupTable,
  answer: answerTable,
  payment: paymentTable,
  user: userTable,
  auditLog: auditLogTable,
};
