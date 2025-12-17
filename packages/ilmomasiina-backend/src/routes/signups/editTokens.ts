import base32Encode from "base32-encode";
import { createHash, createHmac } from "crypto";
import { FastifyRequest } from "fastify";

import type { PaymentPathParams, SignupID, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { EDIT_TOKEN_HEADER, ErrorCode } from "@tietokilta/ilmomasiina-models";
import config from "../../config";
import CustomError from "../../util/customError";

function generateLegacyToken(signupId: SignupID): string {
  const data = Buffer.from(`${signupId}${config.oldEditTokenSalt}`, "utf-8");
  return createHash("md5").update(data).digest().toString("hex");
}

export function generateToken(signupId: SignupID) {
  const key = Buffer.from(config.newEditTokenSecret!, "utf-8");
  const data = Buffer.from(signupId, "utf-8");
  const mac = createHmac("sha256", key).update(data).digest();
  return base32Encode(mac, "RFC4648").substring(0, 13).toLowerCase();
}

function verifyToken(signupId: SignupID, token: string): boolean {
  let expectedToken;
  if (token && config.oldEditTokenSalt && token.length === 32) {
    expectedToken = generateLegacyToken(signupId);
  } else {
    expectedToken = generateToken(signupId);
  }
  return token === expectedToken;
}

class BadEditToken extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.BAD_EDIT_TOKEN, message);
  }
}

/**
 * A preHandler hook that validates signup edit token
 *
 * When the token is not valid, replies with a 403 request with a generic `invalid token`-like error message.
 * The request processing ends here, and the actual route function won't be called.
 */
export async function requireValidEditToken(
  request: FastifyRequest<{ Params: SignupPathParams | PaymentPathParams }>,
): Promise<void> {
  // Fastify converts header names into lower case
  const headers = request.headers[EDIT_TOKEN_HEADER.toLowerCase()];
  const header = Array.isArray(headers) ? headers[0] : headers;
  if (verifyToken(request.params.id, header || "")) return;

  // Default to 403 response
  throw new BadEditToken("Invalid editToken");
}
