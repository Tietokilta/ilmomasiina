import { userTable } from "../db/schema";

export type User = typeof userTable.$inferSelect;
export type UserInsert = typeof userTable.$inferInsert;
