import { describe, expect, test } from "vitest";

import { testEvent } from "../testData";

describe("GET /api/ical", () => {
  test("returns a calendar feed of listed events", async () => {
    const event = await testEvent({}, { listed: true });
    const unlisted = await testEvent({}, { listed: false });

    const response = await server.inject({ method: "GET", url: "/api/ical" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/calendar");
    expect(response.payload).toContain("BEGIN:VCALENDAR");
    expect(response.payload).toContain(`UID:${event.id}@`);
    expect(response.payload).not.toContain(`UID:${unlisted.id}@`);
  });

  test("filters the feed by category", async () => {
    const wanted = await testEvent({}, { category: "ical-wanted" });
    const other = await testEvent({}, { category: "ical-other" });

    const response = await server.inject({ method: "GET", url: "/api/ical?category=ical-wanted" });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain(`UID:${wanted.id}@`);
    expect(response.payload).not.toContain(`UID:${other.id}@`);
  });
});

describe("GET /api/ical/:slug", () => {
  test("returns a single event as a downloadable .ics file", async () => {
    const event = await testEvent();

    const response = await server.inject({ method: "GET", url: `/api/ical/${event.slug}` });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/calendar");
    expect(response.headers["content-disposition"]).toContain(`${event.slug}.ics`);
    expect(response.payload).toContain(`UID:${event.id}@`);
  });

  test("returns 404 for unknown events", async () => {
    const response = await server.inject({ method: "GET", url: "/api/ical/no-such-event" });

    expect(response.statusCode).toBe(404);
  });
});
