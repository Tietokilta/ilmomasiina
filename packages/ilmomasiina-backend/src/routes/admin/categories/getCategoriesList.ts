import { isNull } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import type { CategoriesResponse } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";
import { eventTable } from "../../../db/schema";

export default async function getCategoriesList(
  request: FastifyRequest,
  response: FastifyReply,
): Promise<CategoriesResponse> {
  const results = await getDb()
    .selectDistinct({ category: eventTable.category })
    .from(eventTable)
    .where(isNull(eventTable.deletedAt));

  const categories = results.map((event) => event.category);

  response.status(200);
  return categories;
}
