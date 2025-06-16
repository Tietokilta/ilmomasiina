import debug from "debug";
import { FastifyReply, FastifyRequest } from "fastify";

import { EventID, QuotaID, SignupCreateBody, SignupCreateResponse } from "@tietokilta/ilmomasiina-models";
import { Quota } from "../../models/quota";
import createCache from "../../util/cache";
import { signupRefresher } from "./computeSignupPosition";
import { generateToken } from "./editTokens";
import { NoSuchQuota } from "./errors";

const perfLog = debug("app:perf:signup");

// QuotaID to EventID mapping can be preserved basically forever,
// since they are immutable, random and server-generated.
// The existence will be checked again by createSignupAndRefresh.
// This avoids a ton of unnecessary DB roundtrips which cause contention
// on DB connections and prevent batching from working.
const getEventForQuota = createCache({
  maxAgeMs: 300_000, // 5 min
  logName: "getEventForQuota",
  async get(quotaId: QuotaID): Promise<EventID> {
    const quota = await Quota.findByPk(quotaId, { attributes: ["eventId"] });
    if (!quota) throw new NoSuchQuota("Quota doesn't exist.");
    return quota.eventId;
  },
});

export default async function createSignup(
  request: FastifyRequest<{ Body: SignupCreateBody }>,
  response: FastifyReply,
): Promise<SignupCreateResponse> {
  perfLog(`[${request.id}] Begin handling create request`);
  // Find the event for the given quota.
  const eventId = await getEventForQuota(request.body.quotaId);

  // Create the signup.
  const signup = await signupRefresher(eventId).createSignupAndRefresh({
    body: request.body,
    requestId: request.id,
    auditLogger: request.logEvent,
  });

  response.status(201);
  return {
    id: signup.id,
    editToken: generateToken(signup.id),
  };
}
