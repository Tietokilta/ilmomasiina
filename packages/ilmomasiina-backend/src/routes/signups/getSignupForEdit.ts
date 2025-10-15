import { FastifyReply, FastifyRequest } from "fastify";

import { SignupForEditResponse, SignupPathParams } from "@tietokilta/ilmomasiina-models";
import { getSignupDetails, StringifyApi } from "../utils";

/** Requires editTokenVerification */
export default async function getSignupForEdit(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {

  const response = await getSignupDetails(request.params.id);

  reply.status(200);

  return response as unknown as StringifyApi<typeof response>;
}
