import { Static, Type } from "typebox";

/** Schema for a product line used to compute signup prices. */
export const productSchema = Type.Object({
  name: Type.String({ minLength: 1, description: "Name of the quota, question or option." }),
  amount: Type.Integer({ description: "Integer number of the product purchased." }),
  unitPrice: Type.Integer({ description: "Unit price of the product in cents." }),
});

/** Schema for a product line used to compute signup prices. */
export type ProductSchema = Static<typeof productSchema>;
