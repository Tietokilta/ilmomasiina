import { beforeEach, describe, expect, test } from "vitest";

import { AuditEvent, BrandingResponse, BrandingUpdateBody } from "@tietokilta/ilmomasiina-models";
import { AuditLog } from "../../src/models/auditlog";
import { Branding } from "../../src/models/branding";
import { handleTestResponse } from "./api";

const defaultBranding: BrandingResponse = {
  headerTitle: null,
  headerTitleShort: null,
  brandColor: null,
  dangerColor: null,
  logo: null,
  favicon: null,
};

// 1x1 transparent PNG
const testImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const customBranding: BrandingUpdateBody = {
  headerTitle: "Test Guild Signups",
  headerTitleShort: "Signups",
  brandColor: "#123abc",
  dangerColor: "#cc0000",
  logo: testImage,
  favicon: testImage,
};

async function fetchBranding() {
  const response = await server.inject({
    method: "GET",
    url: "/api/branding",
  });
  return handleTestResponse<BrandingResponse>(response);
}

async function updateBranding(body: unknown, authenticated = true) {
  const response = await server.inject({
    method: "PUT",
    url: "/api/admin/branding",
    body: body as Record<string, unknown>,
    headers: authenticated ? { authorization: adminToken } : {},
  });
  return handleTestResponse<BrandingResponse>(response);
}

beforeEach(async () => {
  await Branding.truncate();
});

describe("GET /api/branding", () => {
  test("returns defaults when nothing is customized", async () => {
    const [data, response] = await fetchBranding();
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(defaultBranding);
  });

  test("returns customized branding", async () => {
    await updateBranding(customBranding);
    const [data, response] = await fetchBranding();
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(customBranding);
  });
});

describe("PUT /api/admin/branding", () => {
  test("requires authentication", async () => {
    const result = await updateBranding(customBranding, false);
    expect(result).toBeApiError(401);
    const [data] = await fetchBranding();
    expect(data).toEqual(defaultBranding);
  });

  test("creates and updates branding", async () => {
    const [created, createResponse] = await updateBranding(customBranding);
    expect(createResponse.statusCode).toBe(200);
    expect(created).toEqual(customBranding);

    const updatedBody = { ...customBranding, headerTitle: "Renamed", logo: null };
    const [updated, updateResponse] = await updateBranding(updatedBody);
    expect(updateResponse.statusCode).toBe(200);
    expect(updated).toEqual(updatedBody);

    const [fetched] = await fetchBranding();
    expect(fetched).toEqual(updatedBody);
  });

  test("allows resetting to defaults", async () => {
    await updateBranding(customBranding);
    const [data, response] = await updateBranding(defaultBranding);
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(defaultBranding);
  });

  test("rejects invalid colors", async () => {
    expect(await updateBranding({ ...defaultBranding, brandColor: "red" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, brandColor: "#fff" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, brandColor: "#12345g" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, dangerColor: "red" })).toBeApiError(400);
  });

  test("rejects invalid images", async () => {
    expect(await updateBranding({ ...defaultBranding, logo: "https://example.com/logo.png" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, logo: "data:text/html;base64,PHNjcmlwdD4=" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, favicon: "data:image/png;base64,not base64!" })).toBeApiError(
      400,
    );
  });

  test("rejects missing fields", async () => {
    expect(await updateBranding({ headerTitle: "Only title" })).toBeApiError(400);
    expect(await updateBranding({ ...defaultBranding, headerTitle: "" })).toBeApiError(400);
  });

  test("creates an audit log entry listing changed fields", async () => {
    await updateBranding({ ...defaultBranding, headerTitle: "Changed", brandColor: "#000000" });

    const logs = await AuditLog.findAll({ where: { action: AuditEvent.EDIT_BRANDING } });
    expect(logs).toHaveLength(1);
    expect(logs[0].user).toBe(adminUser.email);
    expect(JSON.parse(logs[0].extra!)).toEqual({ changed: ["headerTitle", "brandColor"] });
  });
});
