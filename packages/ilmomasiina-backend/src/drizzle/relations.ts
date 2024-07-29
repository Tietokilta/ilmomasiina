import { relations } from 'drizzle-orm/relations';

import {
  answerTable, eventTable, questionTable, quotaTable, signupTable,
} from './schema';

export const quotaRelations = relations(quotaTable, ({ one, many }) => ({
  event: one(eventTable, {
    fields: [quotaTable.eventId],
    references: [eventTable.id],
  }),
  signups: many(signupTable),
}));

export const eventRelations = relations(eventTable, ({ many }) => ({
  quotas: many(quotaTable),
  questions: many(questionTable),
}));

export const questionRelations = relations(questionTable, ({ one, many }) => ({
  event: one(eventTable, {
    fields: [questionTable.eventId],
    references: [eventTable.id],
  }),
  answers: many(answerTable),
}));

export const answerRelations = relations(answerTable, ({ one }) => ({
  question: one(questionTable, {
    fields: [answerTable.questionId],
    references: [questionTable.id],
  }),
  signup: one(signupTable, {
    fields: [answerTable.signupId],
    references: [signupTable.id],
  }),
}));

export const signupRelations = relations(signupTable, ({ one, many }) => ({
  answers: many(answerTable),
  quota: one(quotaTable, {
    fields: [signupTable.quotaId],
    references: [quotaTable.id],
  }),
}));
