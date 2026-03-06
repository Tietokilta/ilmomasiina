import { preParsingAsyncHookHandler } from "fastify";
import { Readable } from "stream";

/** Stores the raw request body into `request.rawBody` for signature verification. */
const getRawBody: preParsingAsyncHookHandler = async (request, _reply, payload) => {
  const chunks: Buffer[] = [];
  for await (const chunk of payload) {
    chunks.push(chunk as Buffer);
  }
  const rawBody = Buffer.concat(chunks);
  // Store raw body for signature verification
  request.rawBody = rawBody;
  // Return a new readable stream with the same data
  return Readable.from(rawBody);
};

export default getRawBody;

declare module "fastify" {
  interface FastifyRequest {
    /** Raw body stored by preParsing hook, used to verify webhook signatures. */
    rawBody?: Buffer;
  }
}
