import { FastifyReply, FastifyRequest } from "fastify";

import type { CheckSlugParams, CheckSlugResponse } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";

export default async function checkSlugAvailability(
  request: FastifyRequest<{ Params: CheckSlugParams }>,
  response: FastifyReply,
): Promise<CheckSlugResponse> {
  const event = await getDb().query.event.findFirst({
    where: { slug: request.params.slug, deletedAt: { isNull: true } },
    columns: { id: true, title: true },
  });

  response.status(200);
  return {
    id: event?.id ?? null,
    title: event?.title ?? null,
  };
}
