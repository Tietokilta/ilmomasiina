import { beforeEach, describe, expect, test } from "vitest";

import {
  AdminBrandingResponse,
  AuditEvent,
  BrandingResponse,
  BrandingUpdateBody,
  emptyBrandingSettings,
} from "@tietokilta/ilmomasiina-models";
import { getBrandingDefaults } from "../../src/branding";
import config from "../../src/config";
import { AuditLog } from "../../src/models/auditlog";
import { Setting } from "../../src/models/setting";
import { testEvent } from "../testData";
import { handleTestResponse } from "./api";

// 1x1 transparent PNG
const testImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const customBranding: BrandingUpdateBody = {
  headerTitle: "Test Guild Signups",
  headerTitleShort: "Signups",
  footerGdprText: "Privacy",
  footerGdprLink: "https://example.com/privacy",
  footerHomeText: "Home",
  footerHomeLink: "https://example.com/",
  loginPlaceholderEmail: "admin@example.com",
  icalCalendarName: "Test Guild Events",
  mailFooterText: "Test Guild ry",
  mailFooterLink: "https://example.com/",
  brandColor: "#123abc",
  secondaryColor: "#abc123",
  successColor: "#00aa00",
  warningColor: "#ffaa00",
  dangerColor: "#cc0000",
  mutedColor: "#777777",
  logo: testImage,
  showLogo: true,
  favicon: testImage,
};

/** Effective branding when nothing is customized. */
const defaultBranding: BrandingResponse = { ...emptyBrandingSettings, ...getBrandingDefaults() };

async function fetchBranding() {
  const response = await server.inject({
    method: "GET",
    url: "/api/branding",
  });
  return handleTestResponse<BrandingResponse>(response);
}

async function fetchAdminBranding(authenticated = true) {
  const response = await server.inject({
    method: "GET",
    url: "/api/admin/branding",
    headers: authenticated ? { authorization: adminToken } : {},
  });
  return handleTestResponse<AdminBrandingResponse>(response);
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
  await Setting.truncate();
});

describe("GET /api/branding", () => {
  test("returns server defaults when nothing is customized", async () => {
    const [data, response] = await fetchBranding();
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(defaultBranding);
    expect(data.headerTitle).toBe(config.brandingHeaderTitle);
    expect(data.loginPlaceholderEmail).toBe(config.brandingLoginPlaceholderEmail);
  });

  test("returns customized branding", async () => {
    await updateBranding(customBranding);
    const [data, response] = await fetchBranding();
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(customBranding);
  });

  test("fills in nulls for keys missing from stored settings", async () => {
    // Simulate settings saved by an older version without some keys.
    await Setting.create({ key: "branding", value: { headerTitle: "Old" } });
    const [data] = await fetchBranding();
    // A custom title without a short title is also used as the short title.
    expect(data).toEqual({ ...defaultBranding, headerTitle: "Old", headerTitleShort: "Old" });
  });
});

describe("GET /api/admin/branding", () => {
  test("requires authentication", async () => {
    expect(await fetchAdminBranding(false)).toBeApiError(401);
  });

  test("returns stored settings and server defaults", async () => {
    await updateBranding({ ...emptyBrandingSettings, headerTitle: "Custom" });
    const [data, response] = await fetchAdminBranding();
    expect(response.statusCode).toBe(200);
    expect(data).toEqual({
      settings: { ...emptyBrandingSettings, headerTitle: "Custom" },
      defaults: getBrandingDefaults(),
    });
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

    const updatedBody = { ...customBranding, headerTitle: "Renamed", logo: null, showLogo: false };
    const [updated, updateResponse] = await updateBranding(updatedBody);
    expect(updateResponse.statusCode).toBe(200);
    expect(updated).toEqual(updatedBody);

    const [fetched] = await fetchBranding();
    expect(fetched).toEqual(updatedBody);
  });

  test("allows resetting to defaults", async () => {
    await updateBranding(customBranding);
    const [data, response] = await updateBranding(emptyBrandingSettings);
    expect(response.statusCode).toBe(200);
    expect(data).toEqual(defaultBranding);
    const [settings] = await fetchAdminBranding();
    expect(settings.settings).toEqual(emptyBrandingSettings);
  });

  test("rejects invalid colors", async () => {
    expect(await updateBranding({ ...emptyBrandingSettings, brandColor: "red" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, brandColor: "#fff" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, secondaryColor: "#12345g" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, successColor: "green" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, dangerColor: "red" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, warningColor: "#ff0" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, mutedColor: "gray" })).toBeApiError(400);
  });

  test("rejects invalid images", async () => {
    expect(await updateBranding({ ...emptyBrandingSettings, logo: "https://example.com/logo.png" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, logo: "data:text/html;base64,PHNjcmlwdD4=" })).toBeApiError(
      400,
    );
    expect(
      await updateBranding({ ...emptyBrandingSettings, favicon: "data:image/png;base64,not base64!" }),
    ).toBeApiError(400);
  });

  test("rejects invalid links and empty texts", async () => {
    // eslint-disable-next-line no-script-url
    expect(await updateBranding({ ...emptyBrandingSettings, footerGdprLink: "javascript:alert(1)" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, footerHomeLink: "example.com" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, headerTitle: "" })).toBeApiError(400);
    expect(await updateBranding({ ...emptyBrandingSettings, showLogo: "yes" })).toBeApiError(400);
  });

  test("rejects missing fields", async () => {
    expect(await updateBranding({ headerTitle: "Only title" })).toBeApiError(400);
  });

  test("creates an audit log entry listing changed fields", async () => {
    await updateBranding({ ...emptyBrandingSettings, headerTitle: "Changed", brandColor: "#000000" });

    const logs = await AuditLog.findAll({ where: { action: AuditEvent.EDIT_BRANDING } });
    expect(logs).toHaveLength(1);
    expect(logs[0].user).toBe(adminUser.email);
    expect(JSON.parse(logs[0].extra!)).toEqual({ changed: ["headerTitle", "brandColor"] });
  });
});

describe("branding in other features", () => {
  test("iCal feed uses the configured calendar name", async () => {
    await testEvent();
    const before = await server.inject({ method: "GET", url: "/api/ical" });
    expect(before.payload).toContain(`X-WR-CALNAME:${config.icalCalendarName}`);

    await updateBranding({ ...emptyBrandingSettings, icalCalendarName: "Test Guild Events" });
    const after = await server.inject({ method: "GET", url: "/api/ical" });
    expect(after.payload).toContain("X-WR-CALNAME:Test Guild Events");
  });

  test("emails use the configured title and footer", async () => {
    await updateBranding({
      ...defaultBranding,
      headerTitle: "Test Guild Signups",
      mailFooterText: "Test Guild ry",
      mailFooterLink: "https://example.com/",
    });
    const response = await server.inject({
      method: "POST",
      url: "/api/admin/users",
      body: { email: "invited@example.com" },
      headers: { authorization: adminToken },
    });
    expect(response.statusCode).toBe(201);
    expect(emailSend).toHaveBeenCalledTimes(1);
    const html = emailSend.mock.calls[0][2];
    expect(html).toContain("Test Guild Signups");
    expect(html).toContain("Test Guild ry");
    expect(html).toContain('href="https://example.com/"');
  });
});
