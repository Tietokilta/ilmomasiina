import { FastifyReply, FastifyRequest } from "fastify";

import type { BrandingResponse } from "@tietokilta/ilmomasiina-models";
import { getBranding } from "../../branding";

/** Returns the current branding settings. Public, as the frontend needs them before login. */
export default async function getBrandingRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<BrandingResponse> {
  const branding = await getBranding();

  reply.status(200);
  return branding;
}
