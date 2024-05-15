import {
  boolean, char, customType, index, integer, pgEnum, pgTable, serial, text, timestamp, unique, varchar,
} from 'drizzle-orm/pg-core';

import { AuditEvent, questionTypes, signupStatuses } from '@tietokilta/ilmomasiina-models';
import { generateRandomId } from './util';

export const enumAuditEvent = pgEnum('enum_audit_action', [AuditEvent.CREATE_EVENT, AuditEvent.DELETE_EVENT, AuditEvent.PUBLISH_EVENT, AuditEvent.UNPUBLISH_EVENT, AuditEvent.EDIT_EVENT, AuditEvent.PROMOTE_SIGNUP, AuditEvent.DELETE_SIGNUP, AuditEvent.EDIT_SIGNUP, AuditEvent.CREATE_USER, AuditEvent.DELETE_USER, AuditEvent.RESET_PASSWORD, AuditEvent.CHANGE_PASSWORD]);
export const enumQuestionType = pgEnum('enum_question_type', questionTypes);
export const enumSignupStatus = pgEnum('enum_signup_status', signupStatuses);
/** Event types that can be audit logged. */

const customJsonb = <TData>(name: string) => customType<{ data: TData; driverData: string }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(value: TData): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): TData {
    return JSON.parse(value);
  },
})(name);
export const SequelizeMeta = pgTable('SequelizeMeta', {
  name: varchar('name', { length: 255 }).primaryKey().notNull(),
});

export const auditlogTable = pgTable('auditlog', {
  id: serial('id').primaryKey().notNull(),
  user: varchar('user', { length: 255 }),
  ipAddress: varchar('ipAddress', { length: 64 }).notNull(),
  action: enumAuditEvent('action').notNull(),
  eventId: char('eventId', { length: 12 }),
  eventName: varchar('eventName', { length: 255 }),
  signupId: char('signupId', { length: 12 }),
  signupName: varchar('signupName', { length: 255 }),
  extra: text('extra'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const eventTable = pgTable(
  'event',
  {
    id: char('id', { length: 12 }).primaryKey().notNull().$defaultFn(generateRandomId),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    date: timestamp('date', { withTimezone: true, mode: 'date' }),
    registrationStartDate: timestamp('registrationStartDate', { withTimezone: true, mode: 'date' }),
    registrationEndDate: timestamp('registrationEndDate', { withTimezone: true, mode: 'date' }),
    openQuotaSize: integer('openQuotaSize').notNull().default(0),
    description: text('description'),
    price: varchar('price', { length: 255 }),
    location: varchar('location', { length: 255 }),
    facebookUrl: varchar('facebookUrl', { length: 255 }),
    webpageUrl: varchar('webpageUrl', { length: 255 }),
    category: varchar('category', { length: 255 }).default('').notNull(),
    draft: boolean('draft').default(true).notNull(),
    listed: boolean('listed').default(true).notNull(),
    signupsPublic: boolean('signupsPublic').default(false).notNull(),
    nameQuestion: boolean('nameQuestion').default(true).notNull(),
    emailQuestion: boolean('emailQuestion').default(true).notNull(),
    verificationEmail: text('verificationEmail'),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { withTimezone: true, mode: 'date' }),
    endDate: timestamp('endDate', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    event_slug_key: unique('event_slug_key').on(table.slug),
  }),
);

export const quotaTable = pgTable(
  'quota',
  {
    id: char('id', { length: 12 }).primaryKey().notNull().$defaultFn(generateRandomId),
    eventId: char('eventId', { length: 12 }).notNull().references(() => eventTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    order: integer('order').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    size: integer('size'),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    idx_quota_main: index('idx_quota_main').on(table.eventId, table.deletedAt),
  }),
);

export const questionTable = pgTable('question', {
  id: char('id', { length: 12 }).primaryKey().notNull().$defaultFn(generateRandomId),
  eventId: char('eventId', { length: 12 }).notNull().references(() => eventTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  order: integer('order').notNull(),
  question: varchar('question', { length: 255 }).notNull(),
  type: enumQuestionType('type').notNull(),
  options: customJsonb<string[] | null>('options'),
  required: boolean('required').default(true).notNull(),
  public: boolean('public').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { withTimezone: true, mode: 'date' }),
});

export const signupTable = pgTable(
  'signup',
  {
    id: char('id', { length: 12 }).primaryKey().notNull().$defaultFn(generateRandomId),
    quotaId: char('quotaId', { length: 12 }).notNull().references(() => quotaTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    firstName: varchar('firstName', { length: 255 }),
    lastName: varchar('lastName', { length: 255 }),
    namePublic: boolean('namePublic').notNull().default(false),
    email: varchar('email', { length: 255 }),
    confirmedAt: timestamp('confirmedAt', { withTimezone: true, mode: 'date' }),
    status: enumSignupStatus('status'),
    position: integer('position'),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { withTimezone: true, mode: 'date' }),
    language: varchar('language', { length: 8 }),
  },
  (table) => ({
    idx_signup_main: index('idx_signup_main').on(table.quotaId, table.confirmedAt, table.createdAt, table.deletedAt),
  }),
);

export const answerTable = pgTable(
  'answer',
  {
    id: serial('id').primaryKey().notNull(),
    questionId: char('questionId', { length: 12 }).notNull().references(() => questionTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    signupId: char('signupId', { length: 12 }).notNull().references(() => signupTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    answer: customJsonb<string[] | string>('answer').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    idx_answer_main: index('idx_answer_main').on(table.questionId, table.signupId, table.deletedAt),
  }),
);

export const userTable = pgTable(
  'user',
  {
    id: serial('id').primaryKey().notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    user_email_key: unique('user_email_key').on(table.email),
  }),
);
