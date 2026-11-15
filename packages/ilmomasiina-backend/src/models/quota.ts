import { quotaTable } from "../db/schema";

export type Quota = typeof quotaTable.$inferSelect;
export type QuotaInsert = typeof quotaTable.$inferInsert;

/** The columns of a quota that can be set through the API. */
export const QUOTA_EDITABLE_COLUMNS = ["title", "size", "price"] as const satisfies readonly (keyof Quota)[];
