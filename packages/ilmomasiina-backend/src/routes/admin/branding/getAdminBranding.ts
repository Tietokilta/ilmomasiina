import { FastifyReply, FastifyRequest } from "fastify";

import type { AdminBrandingResponse } from "@tietokilta/ilmomasiina-models";
import { getBrandingDefaults, getBrandingSettings } from "../../../branding";

/** Returns the stored branding settings along with the server defaults, for editing. */
export default async function getAdminBranding(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AdminBrandingResponse> {
  const settings = await getBrandingSettings();

  reply.status(200);
  return { settings, defaults: getBrandingDefaults() };
}
