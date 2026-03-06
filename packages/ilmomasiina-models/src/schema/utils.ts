import { TSchema, TSchemaOptions, Type } from "typebox";

// eslint-disable-next-line import/prefer-default-export
export const Nullable = <T extends TSchema>(type: T, options?: TSchemaOptions) =>
  Type.Union([type, Type.Null()], options);
