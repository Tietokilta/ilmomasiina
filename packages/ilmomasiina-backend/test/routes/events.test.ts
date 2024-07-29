import assert from 'assert';
import { eq } from 'drizzle-orm';
import { sortBy } from 'lodash';
import { describe, expect, test } from 'vitest';

import { UserEventListResponse, UserEventResponse } from '@tietokilta/ilmomasiina-models';
import { db } from '../../src/drizzle/db';
import { questionTable, quotaTable } from '../../src/drizzle/schema';
import {
  fetchSignups, TestEvent, testEvent, testSignups,
} from '../testData';

async function fetchUserEventList() {
  const response = await server.inject({ method: 'GET', url: '/api/events' });
  expect(response.statusCode).toBeLessThan(500);
  return [response.json<UserEventListResponse>(), response] as const;
}

async function fetchUserEventDetails(event: TestEvent) {
  const response = await server.inject({ method: 'GET', url: `/api/events/${event.slug}` });
  expect(response.statusCode).toBeLessThan(500);
  return [response.json<UserEventResponse>(), response] as const;
}

describe('getEventDetails', () => {
  test('returns event information', async () => {
    const event = await testEvent();
    const [data, response] = await fetchUserEventDetails(event);

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
      questions: expect.any(Array),
      quotas: expect.any(Array),
      millisTillOpening: expect.any(Number),
    });

    const firstQuestion = event.questions![0];
    expect(data.questions).toContainEqual({
      id: firstQuestion.id,
      question: firstQuestion.question,
      type: firstQuestion.type,
      options: firstQuestion.options,
      required: firstQuestion.required,
      public: firstQuestion.public,
    });

    const firstQuota = event.quotas![0];
    expect(data.quotas).toContainEqual({
      id: firstQuota.id,
      title: firstQuota.title,
      size: firstQuota.size,
      signupCount: 0,
      signups: [],
    });
  });

  test('does not return past events', async () => {
    const event = await testEvent({ inPast: true });
    const [data, response] = await fetchUserEventDetails(event);

    expect(response.statusCode).toBe(404);
    expect(data.title).toBe(undefined);
  });

  test('does not return draft events', async () => {
    const event = await testEvent({}, { draft: true });
    const [data, response] = await fetchUserEventDetails(event);

    expect(response.statusCode).toBe(404);
    expect(data.title).toBe(undefined);
  });

  test('returns correct information about signup opening', async () => {
    let event = await testEvent({ signupState: 'open' });
    let [data] = await fetchUserEventDetails(event);

    expect(data.registrationClosed).toBe(false);
    expect(data.millisTillOpening).toBe(0);

    event = await testEvent({ signupState: 'not-open' });
    [data] = await fetchUserEventDetails(event);

    const expectedMillisTillOpening = event.registrationStartDate!.getTime() - Date.now();
    expect(data.registrationClosed).toBe(false);
    expect(data.millisTillOpening).toBeGreaterThan(expectedMillisTillOpening - 500);
    expect(data.millisTillOpening).toBeLessThan(expectedMillisTillOpening + 500);

    event = await testEvent({ signupState: 'closed' });
    [data] = await fetchUserEventDetails(event);

    expect(data.registrationClosed).toBe(true);
    expect(data.millisTillOpening).toBe(0);
  });

  test('returns questions in correct order', async () => {
    const event = await testEvent({ questionCount: 3 });
    const [before] = await fetchUserEventDetails(event);

    expect(before.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, 'order').map((q) => q.id));

    event.questions[event.questions.length - 1] = await db.update(questionTable).set({ order: 0 }).where(eq(questionTable.id, event.questions.at(-1)?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);
    event.questions[0] = await db.update(questionTable).set({ order: event.questions!.length - 1 }).where(eq(questionTable.id, event.questions[0]?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);

    const [after] = await fetchUserEventDetails(event);

    expect(before.questions.map((q) => q.id)).not.toEqual(after.questions.map((q) => q.id));
    expect(after.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, 'order').map((q) => q.id));
  });

  test('returns quotas in correct order', async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));

    event.quotas[event.quotas.length - 1] = await db.update(quotaTable).set({ order: 0 }).where(eq(quotaTable.id, event.quotas.at(-1)?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);
    event.quotas[0] = await db.update(quotaTable).set({ order: event.quotas!.length - 1 }).where(eq(quotaTable.id, event.quotas[0]?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);

    const [after] = await fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).not.toEqual(after.quotas.map((q) => q.id));
    expect(after.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));
  });

  test('returns public signups', async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: true });
    await testSignups(event, { count: 10, confirmed: true }, { namePublic: true });
    const quotas = await fetchSignups(event);

    const [data] = await fetchUserEventDetails(event);

    for (const quota of event.quotas!) {
      const found = data.quotas.find((q) => q.id === quota.id);
      const quotaWithSignups = quotas.find((s) => s.id === quota.id);
      expect(found).toBeTruthy();
      assert(quotaWithSignups);
      assert(found);
      expect(found.signups.length).toEqual(quotaWithSignups.signups.length);
      const firstSignup = quotaWithSignups?.signups[0];
      expect(found?.signups).toContainEqual({
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

  test('respects signupsPublic', async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups(event);

    const [data] = await fetchUserEventDetails(event);

    for (const quota of data.quotas) {
      expect(quota.signups).toEqual([]);
    }
  });

  test('respects namePublic', async () => {
    const event = await testEvent({ quotaCount: 1 }, { signupsPublic: true });
    await testSignups(event, { confirmed: true }, { namePublic: false });

    const [data] = await fetchUserEventDetails(event);

    expect(data.quotas[0].signups.length).toBeGreaterThanOrEqual(1);
    for (const signup of data.quotas[0].signups) {
      expect(signup.firstName).toBe(null);
      expect(signup.lastName).toBe(null);
    }
  });

  test('respects Question.public', async () => {
    const event = await testEvent({ quotaCount: 1, questionCount: 1 }, { signupsPublic: true });
    await testSignups(event, { confirmed: true, count: 1 }, { namePublic: false });
    const quotas = await fetchSignups(event);
    await db.update(questionTable).set({ public: true }).where(eq(questionTable.id, event.questions[0].id));
    const [before] = await fetchUserEventDetails(event);
    const quota = quotas.find((q) => q.id === event.quotas[0].id);
    assert(quota);
    const signup = quota.signups[0];
    expect(before.quotas[0].signups).toMatchObject([{
      answers: [{
        questionId: event.questions![0].id,
        answer: signup.answers![0].answer,
      }],
    }]);

    await db.update(questionTable).set({ public: false }).where(eq(questionTable.id, event.questions[0].id));
    const [after] = await fetchUserEventDetails(event);

    expect(after.quotas[0].signups).toMatchObject([{
      answers: [],
    }]);
  });

  test('returns non-public signup counts', async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups(event, { count: 10 });
    const quotas = await fetchSignups(event);

    const [data] = await fetchUserEventDetails(event);
    console.log(data);
    for (const quota of event.quotas!) {
      const found = data.quotas.find((q) => q.id === quota.id);
      const quotaWithSignups = quotas.find((s) => s.id === quota.id);
      expect(found).toBeTruthy();
      assert(found);
      assert(quotaWithSignups);
      expect(found.signupCount).toEqual(quotaWithSignups.signups.length);
    }
  });
});

describe('getEventList', () => {
  test('returns event information', async () => {
    const event = await testEvent();
    const [data, response] = await fetchUserEventList();

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
      quotas: expect.any(Array),
    });

    const firstQuota = event.quotas[0];
    expect(data[0].quotas).toContainEqual({
      id: firstQuota.id,
      title: firstQuota.title,
      size: firstQuota.size,
      signupCount: 0,
    });
  });

  test('returns signup counts', async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await testSignups(event, { count: 10 });
    const quotaSignups = await fetchSignups(event);

    const [data] = await fetchUserEventList();

    for (const quota of event.quotas) {
      const found = data[0].quotas.find((q) => q.id === quota.id);
      const quotaWithSignups = quotaSignups.find((s) => s.id === quota.id);
      expect(found).toBeTruthy();
      assert(quotaWithSignups);
      assert(found);
      expect(found.signupCount).toEqual(quotaWithSignups.signups.length);
    }
  });

  test('does not return past events', async () => {
    await testEvent({ inPast: true });
    const [data] = await fetchUserEventList();

    expect(data).toEqual([]);
  });

  test('does not return draft events', async () => {
    await testEvent({}, { draft: true });
    const [data] = await fetchUserEventList();

    expect(data).toEqual([]);
  });

  test('returns quotas in correct order', async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchUserEventList();

    expect(before[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas, 'order').map((q) => q.id));
    event.quotas[event.quotas.length - 1] = await db.update(quotaTable).set({ order: 0 }).where(eq(quotaTable.id, event.quotas.at(-1)?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);
    event.quotas[0] = await db.update(quotaTable).set({ order: event.quotas.length - 1 }).where(eq(quotaTable.id, event.quotas[0]?.id ?? '')).returning()
      .execute()
      .then((r) => r[0]);

    const [after] = await fetchUserEventList();
    console.log(event.quotas);
    console.log(sortBy(event.quotas, 'order'));
    expect(before[0].quotas.map((q) => q.id)).not.toEqual(after[0].quotas.map((q) => q.id));
    expect(after[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas, 'order').map((q) => q.id));
  });
});
