import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingResponse, BrandingSchema, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../../models";
import { Branding, BRANDING_ROW_ID, toBrandingSchema } from "../../../models/branding";

/** Replaces the branding settings with the given ones. */
export default async function updateBranding(
  request: FastifyRequest<{ Body: BrandingUpdateBody }>,
  reply: FastifyReply,
): Promise<BrandingResponse> {
  const updated = await getSequelize().transaction(async (transaction) => {
    const existing = await Branding.findByPk(BRANDING_ROW_ID, { transaction });
    const previous = toBrandingSchema(existing);

    const values: BrandingSchema = {
      headerTitle: request.body.headerTitle,
      headerTitleShort: request.body.headerTitleShort,
      brandColor: request.body.brandColor,
      dangerColor: request.body.dangerColor,
      logo: request.body.logo,
      favicon: request.body.favicon,
    };

    let branding: Branding;
    if (existing) {
      branding = await existing.update(values, { transaction });
    } else {
      branding = await Branding.create({ id: BRANDING_ROW_ID, ...values }, { transaction });
    }

    // Log which fields changed. Image data is not logged, as it would bloat the audit log.
    const changed = (Object.keys(values) as (keyof BrandingSchema)[]).filter((key) => previous[key] !== values[key]);
    await request.logEvent(AuditEvent.EDIT_BRANDING, {
      extra: { changed },
      transaction,
    });

    return branding;
  });

  reply.status(200);
  return toBrandingSchema(updated);
}
