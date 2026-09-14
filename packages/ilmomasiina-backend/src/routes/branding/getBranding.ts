import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";
import { Branding, BRANDING_ROW_ID, toBrandingSchema } from "../../models/branding";

/** Returns the current branding settings. Public, as the frontend needs them before login. */
export default async function getBranding(request: FastifyRequest, reply: FastifyReply): Promise<BrandingResponse> {
  const branding = await Branding.findByPk(BRANDING_ROW_ID);

  reply.status(200);
  return toBrandingSchema(branding);
}
