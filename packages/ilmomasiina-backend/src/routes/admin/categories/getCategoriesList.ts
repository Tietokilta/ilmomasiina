import { FastifyReply, FastifyRequest } from 'fastify';

import type { CategoriesResponse } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { eventTable } from '../../../drizzle/schema';

export default async function getCategoriesList(
  request: FastifyRequest,
  response: FastifyReply,
): Promise<CategoriesResponse> {
  const results = await db.selectDistinct({ category: eventTable.category }).from(eventTable).execute();

  const categories = results.map((event) => event.category);

  response.status(200);
  return categories;
}
