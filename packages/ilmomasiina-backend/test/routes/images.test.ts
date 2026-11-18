import { describe, expect, test } from "vitest";

import { Image } from "../../src/models/image";
import { detectImageType, MAX_IMAGE_BYTES } from "../../src/routes/images";
import { testEvent } from "../testData";

// Smallest valid-looking headers; the server only checks the leading bytes.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(32, 3)]);
const PDF = Buffer.from("%PDF-1.7\n%fake pdf\n");
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

/** Builds a multipart/form-data request body with a single file field. */
function multipart(data: Buffer, filename = "image.png", contentType = "image/png") {
  const boundary = "----ilmotestboundary";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function upload(data: Buffer, options: { filename?: string; contentType?: string; auth?: boolean } = {}) {
  const { body, contentType } = multipart(data, options.filename, options.contentType);
  return server.inject({
    method: "POST",
    url: "/api/admin/images",
    headers: { "content-type": contentType, ...(options.auth === false ? {} : { authorization: adminToken }) },
    payload: body,
  });
}

describe("detectImageType", () => {
  test("recognizes PNG, JPEG and WebP by their bytes", () => {
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  test("rejects PDF, SVG and empty data", () => {
    expect(detectImageType(PDF)).toBeNull();
    expect(detectImageType(SVG)).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe("POST /api/admin/images", () => {
  test("stores an image and returns a URL that serves it back", async () => {
    const response = await upload(PNG);
    expect(response.statusCode).toBe(201);

    const { id, url } = response.json<{ id: string; url: string }>();
    expect(url).toMatch(new RegExp(`/api/images/${id}$`));

    const served = await server.inject({ method: "GET", url: `/api/images/${id}` });
    expect(served.statusCode).toBe(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.headers["cache-control"]).toContain("immutable");
    expect(Buffer.compare(served.rawPayload, PNG)).toBe(0);
  });

  test("detects the type from the content, not from the file name", async () => {
    const response = await upload(JPEG, { filename: "photo.png", contentType: "image/png" });
    expect(response.statusCode).toBe(201);
    const { id } = response.json<{ id: string }>();
    const served = await server.inject({ method: "GET", url: `/api/images/${id}` });
    expect(served.headers["content-type"]).toBe("image/jpeg");
  });

  test("rejects PDF and SVG files", async () => {
    expect((await upload(PDF, { filename: "poster.pdf", contentType: "application/pdf" })).statusCode).toBe(415);
    expect((await upload(SVG, { filename: "logo.svg", contentType: "image/svg+xml" })).statusCode).toBe(415);
  });

  test("rejects files over the size limit", async () => {
    const huge = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    expect((await upload(huge)).statusCode).toBe(413);
  });

  test("requires an admin session", async () => {
    expect((await upload(PNG, { auth: false })).statusCode).toBe(401);
  });

  test("rejects requests that are not multipart", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/admin/images",
      headers: { authorization: adminToken },
      payload: { not: "a file" },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("GET /api/images/:id", () => {
  test("returns 404 for unknown and malformed IDs", async () => {
    expect((await server.inject({ method: "GET", url: "/api/images/aaaaaaaaaaaa" })).statusCode).toBe(404);
    expect((await server.inject({ method: "GET", url: "/api/images/not-an-id" })).statusCode).toBe(404);
  });
});

describe("removeUnusedImages", () => {
  test("deletes old unused images and keeps used and recent ones", async () => {
    const { default: removeUnusedImages } = await import("../../src/cron/removeUnusedImages");
    const old = new Date(Date.now() - 48 * 3600 * 1000);

    const unused = await Image.create({ mimeType: "image/png", data: PNG });
    const used = await Image.create({ mimeType: "image/png", data: PNG });
    const recent = await Image.create({ mimeType: "image/png", data: PNG });
    // Back-date the old ones (createdAt can't be set through create()).
    await Image.update({ createdAt: old } as never, { where: { id: [unused.id, used.id] }, silent: true });
    await testEvent({}, { imageUrl: `http://localhost/api/images/${used.id}` });

    await removeUnusedImages();

    expect(await Image.findByPk(unused.id)).toBeNull();
    expect(await Image.findByPk(used.id)).not.toBeNull();
    expect(await Image.findByPk(recent.id)).not.toBeNull();
  });
});
