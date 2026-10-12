import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingSettings, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent, brandingKeys } from "@tietokilta/ilmomasiina-models";
import { getBrandingSettings, setBrandingSettings } from "../../../branding";
import { getSequelize } from "../../../models";

/** Replaces the branding settings with the given ones. Returns the effective branding. */
export default async function updateBranding(
  request: FastifyRequest<{ Body: BrandingUpdateBody }>,
  reply: FastifyReply,
): Promise<BrandingSettings> {
  const settings = await getSequelize().transaction(async (transaction) => {
    const previous = await getBrandingSettings(transaction);
    const saved = await setBrandingSettings(request.body, transaction);

    // Log which fields changed. Values are not logged, as images would bloat the audit log.
    const changed = brandingKeys.filter((key) => previous[key] !== request.body[key]);
    await request.logEvent(AuditEvent.EDIT_BRANDING, {
      extra: { changed },
      transaction,
    });

    return saved;
  });

  reply.status(200);
  return settings;
}
