import { sortBy } from 'lodash';
import { describe, expect, test } from 'vitest';

import { UserEventResponse } from '@tietokilta/ilmomasiina-models';
import { Event } from '../src/models/event';
import { testEvent } from './testData';

async function fetchUserEventDetails(event: Event) {
  const response = await server.inject({ method: 'GET', url: `/api/events/${event.slug}` });
  return [response.json<UserEventResponse>(), response] as const;
}

describe('getEventDetails', () => {
  test('returns event information', async () => {
    const event = await testEvent();
    const [data, response] = await fetchUserEventDetails(event);

    expect(response.statusCode).toBe(200);

    const {
      questions, quotas, millisTillOpening, ...rest
    } = data;

    expect(rest).toEqual({
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
    });

    const firstQuestion = event.questions!.find((q) => q.id === questions[0].id)!;
    expect(questions[0]).toEqual({
      id: firstQuestion.id,
      question: firstQuestion.question,
      type: firstQuestion.type,
      options: firstQuestion.options,
      required: firstQuestion.required,
      public: firstQuestion.public,
    });

    const firstQuota = event.quotas!.find((q) => q.id === quotas[0].id)!;
    expect(quotas[0]).toEqual({
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

    await event.questions!.at(-1)!.update({ order: 0 });
    await event.questions![0].update({ order: event.questions!.length - 1 });

    const [after] = await fetchUserEventDetails(event);

    expect(before.questions.map((q) => q.id)).not.toEqual(after.questions.map((q) => q.id));
    expect(after.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, 'order').map((q) => q.id));
  });

  test('returns quotas in correct order', async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await fetchUserEventDetails(event);

    expect(before.quotas.map((q) => q.id)).not.toEqual(after.quotas.map((q) => q.id));
    expect(after.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));
  });
});
