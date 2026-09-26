import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingResponse, BrandingSettings, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent, brandingKeys } from "@tietokilta/ilmomasiina-models";
import { getBrandingSettings, resolveBranding, setBrandingSettings } from "../../../branding";
import { getSequelize } from "../../../models";

/** Replaces the branding settings with the given ones. Returns the effective branding. */
export default async function updateBranding(
  request: FastifyRequest<{ Body: BrandingUpdateBody }>,
  reply: FastifyReply,
): Promise<BrandingResponse> {
  const settings = await getSequelize().transaction(async (transaction) => {
    const previous = await getBrandingSettings(transaction);
    // Only pick known keys from the body, and normalize missing ones to null.
    const values = Object.fromEntries(
      brandingKeys.map((key) => [key, request.body[key] ?? null]),
    ) as BrandingSettings;

    const saved = await setBrandingSettings(values, transaction);

    // Log which fields changed. Values are not logged, as images would bloat the audit log.
    const changed = brandingKeys.filter((key) => previous[key] !== saved[key]);
    await request.logEvent(AuditEvent.EDIT_BRANDING, {
      extra: { changed },
      transaction,
    });

    return saved;
  });

  reply.status(200);
  return resolveBranding(settings);
}
