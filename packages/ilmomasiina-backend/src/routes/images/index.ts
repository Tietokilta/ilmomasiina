import fastifyMultipart from "@fastify/multipart";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BadRequest, NotFound, UnsupportedMediaType } from "http-errors";

import config from "../../config";
import { Image } from "../../models/image";
import { RANDOM_ID_ALPHABET, RANDOM_ID_LENGTH } from "../../models/randomId";

/** Largest accepted upload, in bytes. Also enforced by the multipart plugin's file size limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const idPattern = new RegExp(`^[${RANDOM_ID_ALPHABET}]{${RANDOM_ID_LENGTH}}$`);

/** Enables multipart parsing for file uploads in the given (encapsulated) Fastify instance. */
export async function registerImageUploads(instance: FastifyInstance) {
  await instance.register(fastifyMultipart, { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });
}

/** Public URL of an uploaded image. */
export function imageUrl(id: string) {
  return `${config.baseUrl}/api/images/${id}`;
}

/** Determines the image type from the file's own bytes, ignoring the client-supplied name and type.
 *
 * Only formats that browsers show safely in an <img> are accepted. SVG is left out on purpose, as it can carry scripts.
 */
export function detectImageType(data: Buffer): string | null {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/** Admin route: stores an uploaded image and returns its public URL. */
export async function uploadImage(request: FastifyRequest, reply: FastifyReply): Promise<{ id: string; url: string }> {
  if (!request.isMultipart()) throw new BadRequest("Expected a multipart/form-data upload");

  const file = await request.file();
  if (!file) throw new BadRequest("No file uploaded");

  // Throws a 413 error if the file is over the size limit.
  const data = await file.toBuffer();

  const mimeType = detectImageType(data);
  if (!mimeType) throw new UnsupportedMediaType("Only PNG, JPEG and WebP images are supported");

  const image = await Image.create({ mimeType, data });

  reply.status(201);
  return { id: image.id, url: imageUrl(image.id) };
}

/** Public route: serves an uploaded image. */
export async function getImage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = request.params;
  if (!idPattern.test(id)) throw new NotFound("Image not found");

  const image = await Image.findByPk(id);
  if (!image) throw new NotFound("Image not found");

  // Images are never modified after upload, so they can be cached for good.
  reply.header("Content-Type", image.mimeType);
  reply.header("Cache-Control", "public, max-age=31536000, immutable");
  reply.header("X-Content-Type-Options", "nosniff");
  return reply.send(image.data);
}
