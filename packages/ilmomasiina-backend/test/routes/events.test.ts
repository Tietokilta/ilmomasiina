import { sortBy } from "lodash";
import { describe, expect, test } from "vitest";

import { PaymentMode } from "@tietokilta/ilmomasiina-models";
import { fetchSignups, testEvent, testSignups } from "../testData";
import * as api from "./api";

describe("GET /api/events/:id", () => {
  test("returns event information", async () => {
    // Enable payments to not scrub any fields when saving
    const event = await testEvent({}, { payments: PaymentMode.ONLINE });
    const [data, response] = await api.fetchUserEventDetails(event);

    expect(response.statusCode).toBe(200);

    expect(data).toEqual({
      id: event.id,
      title: event.title,
      slug: event.slug,
      date: event.date?.toISOString() ?? null,
      endDate: event.endDate?.toISOString() ?? null,
      registrationStartDate: event.registrationStartDate?.toISOString() ?? null,
      registrationEndDate: event.registrationEndDate?.toISOString() ?? null,
      openQuotaSize: event.openQuotaSize,
      description: event.description,
      price: event.price,
      location: event.location,
      facebookUrl: event.facebookUrl,
      webpageUrl: event.webpageUrl,
      category: event.category,
      signupsPublic: event.signupsPublic,
      nameQuestion: event.nameQuestion,
      emailQuestion: event.emailQuestion,
      registrationClosed: false,
      payments: event.payments,
      questions: expect.any(Array),
      quotas: expect.any(Array),
      defaultLanguage: event.defaultLanguage,
      languages: event.languages,
      millisTillOpening: expect.any(Number),
    });

    const firstQuestion = event.questions![0];
    expect(data.questions).toContainEqual({
      id: firstQuestion.id,
      question: firstQuestion.question,
      type: firstQuestion.type,
      options: firstQuestion.options,
      prices: firstQuestion.prices,
      required: firstQuestion.required,
      public: firstQuestion.public,
    });

    const firstQuota = event.quotas![0];
    expect(data.quotas).toContainEqual({
      id: firstQuota.id,
      title: firstQuota.title,
      size: firstQuota.size,
      price: firstQuota.price,
      signupCount: 0,
      signups: [],
    });
  });

  test("does not return past events", async () => {
    const event = await testEvent({ inPast: 8 * 30 }); // past the default 6-month cutoff
    const [data, response] = await api.fetchUserEventDetails(event);

    expect(response.statusCode).toBe(404);
    expect(data.slug).toBe(undefined);
  });

  test("returns unlisted events", async () => {
    const event = await testEvent({}, { listed: false });
    const [data, response] = await api.fetchUserEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.slug).toBe(event.slug);
  });

  test("does not return draft events", async () => {
    const event = await testEvent({}, { draft: true });
    const [data, response] = await api.fetchUserEventDetails(event);

    expect(response.statusCode).toBe(404);
    expect(data.slug).toBe(undefined);
  });

  test("returns correct information about signup opening", async () => {
    let event = await testEvent({ signupState: "open" });
    let [data] = await api.fetchUserEventDetails(event);

    expect(data.registrationClosed).toBe(false);
    expect(data.millisTillOpening).toBe(0);

    event = await testEvent({ signupState: "not-open" });
    [data] = await api.fetchUserEventDetails(event);

    const expectedMillisTillOpening = event.registrationStartDate!.getTime() - Date.now();
    expect(data.registrationClosed).toBe(false);
    expect(data.millisTillOpening).toBeGreaterThan(expectedMillisTillOpening - 500);
    expect(data.millisTillOpening).toBeLessThan(expectedMillisTillOpening + 500);

    event = await testEvent({ signupState: "closed" });
    [data] = await api.fetchUserEventDetails(event);

    expect(data.registrationClosed).toBe(true);
    expect(data.millisTillOpening).toBe(0);
  });

  test("returns questions in correct order", async () => {
    const event = await testEvent({ questionCount: 3 });
    const [before] = await api.fetchUserEventDetails(event);

    expect(before.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, "order").map((q) => q.id));

    await event.questions!.at(-1)!.update({ order: 0 });
    await event.questions![0].update({ order: event.questions!.length - 1 });

    const [after] = await api.fetchUserEventDetails(event);

    expect(before.questions.map((q) => q.id)).not.toEqual(after.questions.map((q) => q.id));
    expect(after.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, "order").map((q) => q.id));
  });

  test("returns quotas in correct order", async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await api.fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await api.fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).not.toEqual(after.quotas.map((q) => q.id));
    expect(after.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));
  });

  test("returns public signups", async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: true });
    await testSignups({ event, count: 10, confirmed: true, overrides: { namePublic: true } });
    await fetchSignups(event);

    const [data] = await api.fetchUserEventDetails(event);

    for (const quota of event.quotas!) {
      const found = data.quotas.find((q) => q.id === quota.id);
      expect(found).toBeTruthy();
      expect(found!.signups.length).toEqual(quota.signups!.length);
      const firstSignup = quota.signups![0];
      expect(found!.signups).toContainEqual({
        firstName: firstSignup.firstName,
        lastName: firstSignup.lastName,
        confirmed: true,
        namePublic: true,
        createdAt: firstSignup.createdAt.toISOString(),
        answers: expect.any(Array),
        status: null,
        position: null,
      });
    }
  });

  test("respects signupsPublic", async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups({ event });

    const [data] = await api.fetchUserEventDetails(event);

    for (const quota of data.quotas) {
      expect(quota.signups).toEqual([]);
    }
  });

  test("respects namePublic", async () => {
    const event = await testEvent({ quotaCount: 1 }, { signupsPublic: true });
    await testSignups({ event, confirmed: true, overrides: { namePublic: false } });

    const [data] = await api.fetchUserEventDetails(event);

    expect(data.quotas[0].signups.length).toBeGreaterThanOrEqual(1);
    for (const signup of data.quotas[0].signups) {
      expect(signup.firstName).toBe(null);
      expect(signup.lastName).toBe(null);
    }
  });

  test("respects Question.public", async () => {
    const event = await testEvent({ quotaCount: 1, questionCount: 1 }, { signupsPublic: true });
    await testSignups({ event, confirmed: true, count: 1, overrides: { namePublic: false } });
    await fetchSignups(event);

    await event.questions![0].update({ public: true });
    const [before] = await api.fetchUserEventDetails(event);

    const signup = event.quotas![0].signups![0];
    expect(before.quotas[0].signups).toMatchObject([
      {
        answers: [
          {
            questionId: event.questions![0].id,
            answer: signup.answers![0].answer,
          },
        ],
      },
    ]);

    await event.questions![0].update({ public: false });
    const [after] = await api.fetchUserEventDetails(event);

    expect(after.quotas[0].signups).toMatchObject([
      {
        answers: [],
      },
    ]);
  });

  test("returns non-public signup counts", async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups({ event, count: 10 });
    await fetchSignups(event);

    const [data] = await api.fetchUserEventDetails(event);

    for (const quota of event.quotas!) {
      const found = data.quotas.find((q) => q.id === quota.id);
      expect(found).toBeTruthy();
      expect(found!.signupCount).toEqual(quota.signups!.length);
    }
  });
});

describe("GET /api/events", () => {
  test("returns event information", async () => {
    // Enable payments to not scrub any fields when saving
    const event = await testEvent({}, { payments: PaymentMode.MANUAL });
    const [data, response] = await api.fetchUserEventList();

    expect(response.statusCode).toBe(200);

    expect(data.length).toBe(1);

    expect(data[0]).toEqual({
      id: event.id,
      title: event.title,
      slug: event.slug,
      date: event.date?.toISOString() ?? null,
      endDate: event.endDate?.toISOString() ?? null,
      registrationStartDate: event.registrationStartDate?.toISOString() ?? null,
      registrationEndDate: event.registrationEndDate?.toISOString() ?? null,
      openQuotaSize: event.openQuotaSize,
      description: event.description,
      price: event.price,
      location: event.location,
      facebookUrl: event.facebookUrl,
      webpageUrl: event.webpageUrl,
      category: event.category,
      signupsPublic: event.signupsPublic,
      nameQuestion: event.nameQuestion,
      emailQuestion: event.emailQuestion,
      payments: event.payments,
      defaultLanguage: event.defaultLanguage,
      languages: expect.any(Object),
      quotas: expect.any(Array),
    });

    const firstQuota = event.quotas![0];
    expect(data[0].quotas).toContainEqual({
      id: firstQuota.id,
      title: firstQuota.title,
      size: firstQuota.size,
      price: firstQuota.price,
      signupCount: 0,
    });
  });

  test("returns signup counts", async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups({ event, count: 10 });
    await fetchSignups(event);

    const [data] = await api.fetchUserEventList();

    for (const quota of event.quotas!) {
      const found = data[0].quotas.find((q) => q.id === quota.id);
      expect(found).toBeTruthy();
      expect(found!.signupCount).toEqual(quota.signups!.length);
    }
  });

  test("does not return past events", async () => {
    await testEvent({ inPast: 8 * 30 }); // past the default 6-month cutoff
    const [data] = await api.fetchUserEventList();

    expect(data).toEqual([]);
  });

  test("does not return unlisted events", async () => {
    await testEvent({}, { listed: false });
    const [data] = await api.fetchUserEventList();

    expect(data).toEqual([]);
  });

  test("does not return draft events", async () => {
    await testEvent({}, { draft: true });
    const [data] = await api.fetchUserEventList();

    expect(data).toEqual([]);
  });

  test("respects maxAge parameter", async () => {
    const alwaysVisible = await testEvent({ inPast: false }); // in future, so always visible
    const defaultVisible = await testEvent({ inPast: 3 }); // in recent past, so visible by default
    const oldButVisible = await testEvent({ inPast: 3 * 30 }); // within default 6-month cutoff, not visible by default
    await testEvent({ inPast: 8 * 30 }); // past default 6-month cutoff

    const [data] = await api.fetchUserEventList();
    expect(data.map((e) => e.slug).sort()).toEqual([alwaysVisible.slug, defaultVisible.slug].sort());

    const [data2] = await api.fetchUserEventList({ maxAge: 0 });
    expect(data2.map((e) => e.slug).sort()).toEqual([alwaysVisible.slug].sort());

    const [data3] = await api.fetchUserEventList({ maxAge: 6 * 30 });
    expect(data3.map((e) => e.slug).sort()).toEqual(
      [alwaysVisible.slug, defaultVisible.slug, oldButVisible.slug].sort(),
    );

    // ensure the 6-month cutoff can't be bypassed
    const [data4] = await api.fetchUserEventList({ maxAge: 12 * 30 });
    expect(data4.map((e) => e.slug).sort()).toEqual(
      [alwaysVisible.slug, defaultVisible.slug, oldButVisible.slug].sort(),
    );
  });

  test("returns quotas in correct order", async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await api.fetchUserEventList();

    expect(before[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await api.fetchUserEventList();

    expect(before[0].quotas.map((q) => q.id)).not.toEqual(after[0].quotas.map((q) => q.id));
    expect(after[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));
  });
});
