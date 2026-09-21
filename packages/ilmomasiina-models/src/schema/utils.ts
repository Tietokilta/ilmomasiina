import { TSchema, TSchemaOptions, Type } from "typebox";

export const Nullable = <T extends TSchema>(type: T, options?: TSchemaOptions) =>
  Type.Union([type, Type.Null()], options);
