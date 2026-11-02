import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingSettings } from "@tietokilta/ilmomasiina-models";
import { getBrandingSettings } from "../../branding";

/** Returns the current branding settings. Public, as the frontend needs them before login. */
export async function getBranding(request: FastifyRequest, reply: FastifyReply): Promise<BrandingSettings> {
  const branding = await getBrandingSettings();

  reply.status(200);
  return branding;
}
