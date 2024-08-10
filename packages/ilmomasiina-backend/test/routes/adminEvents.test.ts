import { sortBy } from 'lodash';
import { describe, expect, test } from 'vitest';

import { AdminEventListResponse, AdminEventResponse, EventCreateBody } from '@tietokilta/ilmomasiina-models';
import { Event } from '../../src/models/event';
import { Question } from '../../src/models/question';
import { stringifyDates } from '../../src/routes/utils';
import {
  fetchSignups, testEvent, testEventAttributes, testSignups,
} from '../testData';

async function fetchAdminEventList() {
  const response = await server.inject({
    method: 'GET',
    url: '/api/admin/events',
    headers: { authorization: adminToken },
  });
  return [response.json<AdminEventListResponse>(), response] as const;
}

async function fetchAdminEventDetails(event: Pick<Event, 'id'>) {
  const response = await server.inject({
    method: 'GET',
    url: `/api/admin/events/${event.id}`,
    headers: { authorization: adminToken },
  });
  return [response.json<AdminEventResponse>(), response] as const;
}

async function createEvent(body: EventCreateBody) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/admin/events',
    body,
    headers: { authorization: adminToken },
  });
  return [response.json<AdminEventResponse>(), response] as const;
}

describe('GET /api/admin/events/:id', () => {
  test('returns event information', async () => {
    const event = await testEvent();
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);

    expect(data).toEqual({
      id: event.id,
      title: event.title,
      slug: event.slug,
      listed: event.listed,
      draft: event.draft,
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
      verificationEmail: event.verificationEmail,
      questions: expect.any(Array),
      quotas: expect.any(Array),
      updatedAt: event.updatedAt.toISOString(),
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

  test('returns past events', async () => {
    const event = await testEvent({ inPast: true });
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test('returns unlisted events', async () => {
    const event = await testEvent({}, { listed: false });
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test('returns draft events', async () => {
    const event = await testEvent({}, { draft: true });
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test('returns questions in correct order', async () => {
    const event = await testEvent({ questionCount: 3 });
    const [before] = await fetchAdminEventDetails(event);

    expect(before.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, 'order').map((q) => q.id));

    await event.questions!.at(-1)!.update({ order: 0 });
    await event.questions![0].update({ order: event.questions!.length - 1 });

    const [after] = await fetchAdminEventDetails(event);

    expect(before.questions.map((q) => q.id)).not.toEqual(after.questions.map((q) => q.id));
    expect(after.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, 'order').map((q) => q.id));
  });

  test('returns quotas in correct order', async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchAdminEventDetails(event);

    expect(before.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await fetchAdminEventDetails(event);

    expect(before.quotas.map((q) => q.id)).not.toEqual(after.quotas.map((q) => q.id));
    expect(after.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));
  });

  test('always returns signups with full data', async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await Question.update({ public: false, required: true }, { where: { eventId: event.id } });
    await testSignups(event, { count: 10 }, { namePublic: false });
    await fetchSignups(event);

    const [data] = await fetchAdminEventDetails(event);

    for (const quota of event.quotas!) {
      const found = data.quotas.find((q) => q.id === quota.id);
      expect(found).toBeTruthy();
      expect(found!.signups.length).toEqual(quota.signups!.length);
      const firstSignup = quota.signups![0];
      expect(found!.signups).toContainEqual({
        id: firstSignup.id,
        firstName: firstSignup.firstName,
        lastName: firstSignup.lastName,
        email: firstSignup.email,
        confirmed: firstSignup.confirmedAt != null,
        namePublic: firstSignup.namePublic,
        createdAt: firstSignup.createdAt.toISOString(),
        answers: expect.any(Array),
        status: null,
        position: null,
      });

      const foundSignup = found!.signups.find((signup) => signup.id === firstSignup.id);
      expect(foundSignup!.answers.length).toBe(event.questions!.length);
      const firstAnswer = firstSignup.answers![0];
      expect(foundSignup!.answers).toContainEqual({
        questionId: firstAnswer.questionId,
        answer: firstAnswer.answer,
      });
    }
  });
});

describe('GET /api/admin/events', () => {
  test('returns event information', async () => {
    const event = await testEvent();
    const [data, response] = await fetchAdminEventList();

    expect(response.statusCode).toBe(200);

    expect(data.length).toBe(1);

    expect(data[0]).toEqual({
      id: event.id,
      title: event.title,
      slug: event.slug,
      draft: event.draft,
      listed: event.listed,
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

    const firstQuota = event.quotas![0];
    expect(data[0].quotas).toContainEqual({
      id: firstQuota.id,
      title: firstQuota.title,
      size: firstQuota.size,
      signupCount: 0,
    });
  });

  test('returns past events', async () => {
    const event = await testEvent({ inPast: true });
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test('returns unlisted events', async () => {
    const event = await testEvent({}, { listed: false });
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test('returns draft events', async () => {
    const event = await testEvent({}, { draft: true });
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test('returns quotas in correct order', async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchAdminEventList();

    expect(before[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await fetchAdminEventList();

    expect(before[0].quotas.map((q) => q.id)).not.toEqual(after[0].quotas.map((q) => q.id));
    expect(after[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, 'order').map((q) => q.id));
  });
});

function eventBody(): EventCreateBody {
  return stringifyDates({
    ...testEventAttributes(),
    questions: [], // TODO
    quotas: [],
  });
}

describe('POST /api/admin/events', () => {
  test('creates events', async () => {
    const postBody = eventBody();
    const [postData, postResponse] = await createEvent(postBody);

    expect(postResponse.statusCode).toBe(201);

    const event = await Event.findByPk(postData.id);
    expect(event).toBeTruthy();
    expect(event!.title).toBe(postBody.title);
    expect(event!.slug).toBe(postBody.slug);
    expect(event!.listed).toBe(postBody.listed);
    expect(event!.draft).toBe(postBody.draft);
    expect(event!.date).toEqual(postBody.date ? new Date(postBody.date) : null);
    expect(event!.endDate).toBe(postBody.endDate ? new Date(postBody.endDate) : null);
    expect(event!.registrationStartDate).toBe(postBody.registrationStartDate ? new Date(postBody.registrationStartDate) : null);
    expect(event!.registrationEndDate).toBe(postBody.registrationEndDate ? new Date(postBody.registrationEndDate) : null);
    expect(event!.openQuotaSize).toBe(postBody.openQuotaSize);
    expect(event!.description).toBe(postBody.description);
    expect(event!.price).toBe(postBody.price);
    expect(event!.location).toBe(postBody.location);
    expect(event!.facebookUrl).toBe(postBody.facebookUrl);
    expect(event!.webpageUrl).toBe(postBody.webpageUrl);
    expect(event!.category).toBe(postBody.category);
    expect(event!.signupsPublic).toBe(postBody.signupsPublic);
    expect(event!.nameQuestion).toBe(postBody.nameQuestion);
    expect(event!.emailQuestion).toBe(postBody.emailQuestion);
    expect(event!.verificationEmail).toBe(postBody.verificationEmail);
    expect(event!.createdAt).toEqual(event!.updatedAt);
    expect(event!.updatedAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 2000);

    // verify the POST response against the GET one, should be equal
    const [getData, getResponse] = await fetchAdminEventDetails(postData);
    expect(getResponse.statusCode).toBe(200);
    expect(postData).toEqual(getData);
  });
});
