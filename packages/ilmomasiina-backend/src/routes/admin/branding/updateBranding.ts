import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingResponse, BrandingSchema, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent, brandingKeys } from "@tietokilta/ilmomasiina-models";
import { getBranding, setBranding } from "../../../branding";
import { getSequelize } from "../../../models";

/** Replaces the branding settings with the given ones. */
export default async function updateBranding(
  request: FastifyRequest<{ Body: BrandingUpdateBody }>,
  reply: FastifyReply,
): Promise<BrandingResponse> {
  const updated = await getSequelize().transaction(async (transaction) => {
    const previous = await getBranding(transaction);
    // Only pick known keys from the body, and normalize missing ones to null.
    const values = Object.fromEntries(
      brandingKeys.map((key) => [key, request.body[key] ?? null]),
    ) as BrandingSchema;

    const branding = await setBranding(values, transaction);

    // Log which fields changed. Values are not logged, as images and CSS would bloat the audit log.
    const changed = brandingKeys.filter((key) => previous[key] !== branding[key]);
    await request.logEvent(AuditEvent.EDIT_BRANDING, {
      extra: { changed },
      transaction,
    });

    return branding;
  });

  reply.status(200);
  return updated;
}
