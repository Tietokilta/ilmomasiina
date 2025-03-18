import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BadRequest, HttpError, Unauthorized } from "http-errors";

import type { AdminLoginBody, AdminLoginResponse } from "@tietokilta/ilmomasiina-models";
import AdminAuthSession, { AdminTokenData } from "../../authentication/adminAuthSession";
import AdminGoogleAuth from "../../authentication/adminGoogleAuth";
import AdminPasswordAuth from "../../authentication/adminPasswordAuth";
import { User } from "../../models/user";
import CustomError from "../../util/customError";

export function adminLogin(session: AdminAuthSession) {
  return async (
    request: FastifyRequest<{ Body: AdminLoginBody }>,
    reply: FastifyReply,
  ): Promise<AdminLoginResponse> => {
    let user;

    if (request.body.provider === "local") {
      if (!request.body.email || !request.body.password) throw new BadRequest("Missing email and/or password");

      // Find user
      user = await User.findOne({ where: { email: request.body.email } });

      // Verify password
      let valid;
      if (!user || !user.password) {
        // Mitigate user enumeration by timing: waste some time if we can't actually verify a password
        AdminPasswordAuth.createHash("hunter2");
        valid = false;
      } else {
        valid = AdminPasswordAuth.verifyHash(request.body.password, user.password);
      }
      if (!valid) throw new Unauthorized("Invalid email or password");
    } else if (request.body.provider === "google") {
      if (!request.body.oauthCode) throw new BadRequest("Missing oauthCode");

      const idToken = await AdminGoogleAuth.authenticate(request.body.oauthCode);

      user = await User.findOne({ where: { googleUserId: idToken /* TODO .sub */ } });
    } else {
      throw new BadRequest("No valid login method found");
    }

    // Authentication success -> generate auth token
    const accessToken = session.createSession({
      user: user.id,
      email: user.email,
    });
    reply.status(200);
    return { accessToken };
  };
}

export function renewAdminToken(session: AdminAuthSession) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<AdminLoginResponse | void> => {
    // Verify existing token
    const sessionData = session.verifySession(request);

    // Verify that the user exists
    const user = await User.findByPk(sessionData.user);
    if (!user) {
      throw new Unauthorized("User no longer exists");
    }

    // Create a new one
    const accessToken = session.createSession(sessionData);
    reply.status(200);
    return { accessToken };
  };
}

/** Adds a request hook that verifies the user's session and raises a 401 error if invalid. */
export function requireAdmin(session: AdminAuthSession, fastify: FastifyInstance): void {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply) => {
    try {
      // Validate session & decorate request with session data
      (request.sessionData as AdminTokenData) = session.verifySession(request);
    } catch (err) {
      // Throwing inside hook is not safe, so the errors must be converted to actual reply here
      fastify.log.error(err);
      if (err instanceof HttpError || err instanceof CustomError) {
        reply.code(err.statusCode).send(err);
      } else {
        reply.internalServerError("Session validation failed");
      }
    }
  });
}

declare module "fastify" {
  interface FastifyRequest {
    readonly sessionData: AdminTokenData;
  }
}
