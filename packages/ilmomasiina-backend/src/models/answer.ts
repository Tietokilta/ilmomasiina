import { answerTable } from "../db/schema";

export type Answer = typeof answerTable.$inferSelect;
export type AnswerInsert = typeof answerTable.$inferInsert;
