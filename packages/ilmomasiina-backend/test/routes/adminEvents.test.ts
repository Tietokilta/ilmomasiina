import { faker } from "@faker-js/faker";
import { sortBy } from "lodash";
import moment from "moment";
import { describe, expect, test } from "vitest";

import {
  AuditEvent,
  EventCreateBody,
  EventUpdateBody,
  PaymentMode,
  QuestionType,
  SignupPaymentStatus,
} from "@tietokilta/ilmomasiina-models";
import { AuditLog } from "../../src/models/auditlog";
import { Event } from "../../src/models/event";
import { Question } from "../../src/models/question";
import { Quota } from "../../src/models/quota";
import { toDate } from "../../src/routes/utils";
import {
  fetchSignups,
  testEvent,
  testEventAttributes,
  testQuestionOptions,
  testQuestionPrices,
  testSignups,
} from "../testData";
import { createEvent, deleteEvent, fetchAdminEventDetails, fetchAdminEventList, updateEvent } from "./api";

describe("GET /api/admin/events/:id", () => {
  test("returns event information", async () => {
    // Enable payments to not scrub any fields when saving
    const event = await testEvent({}, { payments: PaymentMode.ONLINE });
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
      payments: event.payments,
      questions: expect.any(Array),
      quotas: expect.any(Array),
      defaultLanguage: event.defaultLanguage,
      languages: event.languages,
      updatedAt: event.updatedAt.toISOString(),
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

  test("returns past events", async () => {
    const event = await testEvent({ inPast: 8 * 30 }); // past the default 6 month cutoff for users
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test("returns unlisted events", async () => {
    const event = await testEvent({}, { listed: false });
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test("returns draft events", async () => {
    const event = await testEvent({}, { draft: true });
    const [data, response] = await fetchAdminEventDetails(event);

    expect(response.statusCode).toBe(200);
    expect(data.id).toBe(event.id);
  });

  test("returns questions in correct order", async () => {
    const event = await testEvent({ questionCount: 3 });
    const [before] = await fetchAdminEventDetails(event);

    expect(before.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, "order").map((q) => q.id));

    await event.questions!.at(-1)!.update({ order: 0 });
    await event.questions![0].update({ order: event.questions!.length - 1 });

    const [after] = await fetchAdminEventDetails(event);

    expect(before.questions.map((q) => q.id)).not.toEqual(after.questions.map((q) => q.id));
    expect(after.questions.map((q) => q.id)).toEqual(sortBy(event.questions!, "order").map((q) => q.id));
  });

  test("returns quotas in correct order", async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchAdminEventDetails(event);

    expect(before.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await fetchAdminEventDetails(event);

    expect(before.quotas.map((q) => q.id)).not.toEqual(after.quotas.map((q) => q.id));
    expect(after.quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));
  });

  test("always returns signups with full data", async () => {
    const event = await testEvent({ quotaCount: 3 }, { signupsPublic: false });
    await Question.update({ public: false, required: true }, { where: { eventId: event.id } });
    await testSignups({ event, count: 10, overrides: { namePublic: false } });
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
        price: firstSignup.price,
        currency: firstSignup.currency,
        status: null,
        position: null,
        paymentStatus: SignupPaymentStatus.PENDING,
        manualPaymentStatus: null,
        deletedAt: null,
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

describe("GET /api/admin/events", () => {
  test("returns event information", async () => {
    // Enable payments to not scrub any fields when saving
    const event = await testEvent({}, { payments: PaymentMode.MANUAL });
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
      nameQuestion: event.nameQuestion,
      emailQuestion: event.emailQuestion,
      payments: event.payments,
      quotas: expect.any(Array),
      defaultLanguage: event.defaultLanguage,
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

  test("returns past events", async () => {
    const event = await testEvent({ inPast: 8 * 30 }); // past the default 6 month cutoff for users
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test("returns unlisted events", async () => {
    const event = await testEvent({}, { listed: false });
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test("returns draft events", async () => {
    const event = await testEvent({}, { draft: true });
    const [data] = await fetchAdminEventList();

    expect(data).toMatchObject([{ id: event.id }]);
  });

  test("returns quotas in correct order", async () => {
    const event = await testEvent({ quotaCount: 3 });
    const [before] = await fetchAdminEventList();

    expect(before[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));

    await event.quotas!.at(-1)!.update({ order: 0 });
    await event.quotas![0].update({ order: event.quotas!.length - 1 });

    const [after] = await fetchAdminEventList();

    expect(before[0].quotas.map((q) => q.id)).not.toEqual(after[0].quotas.map((q) => q.id));
    expect(after[0].quotas.map((q) => q.id)).toEqual(sortBy(event.quotas!, "order").map((q) => q.id));
  });
});

function eventBody(): EventCreateBody {
  const attribs = testEventAttributes();
  return {
    ...attribs,
    date: attribs.date?.toISOString() ?? null,
    endDate: attribs.endDate?.toISOString() ?? null,
    registrationStartDate: attribs.registrationStartDate?.toISOString() ?? null,
    registrationEndDate: attribs.registrationEndDate?.toISOString() ?? null,
    questions: [],
    quotas: [],
  };
}

describe("POST /api/admin/events", () => {
  test("creates events", async () => {
    const options = [testQuestionOptions(), testQuestionOptions()];
    const postBody: EventCreateBody = {
      ...eventBody(),
      questions: [
        {
          type: QuestionType.TEXT,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options: null,
          prices: null,
        },
        {
          type: QuestionType.TEXT_AREA,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: true,
          options: null,
          prices: null,
        },
        {
          type: QuestionType.NUMBER,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: false,
          public: true,
          options: null,
          prices: null,
        },
        {
          type: QuestionType.SELECT,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: false,
          public: false,
          options: options[0],
          prices: testQuestionPrices(options[0].length),
        },
        {
          type: QuestionType.CHECKBOX,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: true,
          options: options[1],
          prices: testQuestionPrices(options[1].length),
        },
      ],
      quotas: faker.helpers.multiple(
        () => ({
          title: faker.lorem.words({ min: 1, max: 3 }),
          size: faker.number.int({ min: 10, max: 50 }),
          price: faker.number.int({ min: 0, max: 10000 }),
        }),
        { count: 2 },
      ),
    };
    const [createBody, createResponse] = await createEvent(postBody);

    expect(createResponse.statusCode).toBe(201);

    const event = await Event.findByPk(createBody.id, {
      include: [Question, Quota],
      order: [
        [Question, "order", "ASC"],
        [Quota, "order", "ASC"],
      ],
    });
    expect(event).toBeTruthy();
    expect(event!.title).toBe(postBody.title);
    expect(event!.slug).toBe(postBody.slug);
    expect(event!.listed).toBe(postBody.listed);
    expect(event!.draft).toBe(postBody.draft);
    expect(event!.date).toStrictEqual(toDate(postBody.date));
    expect(event!.endDate).toStrictEqual(toDate(postBody.endDate));
    expect(event!.registrationStartDate).toStrictEqual(toDate(postBody.registrationStartDate));
    expect(event!.registrationEndDate).toStrictEqual(toDate(postBody.registrationEndDate));
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
    expect(event!.createdAt).toStrictEqual(event!.updatedAt);
    expect(event!.updatedAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 2000);

    expect(event!.quotas!.length).toBe(createBody.quotas.length);
    postBody.quotas.forEach((postQuota, index) => {
      const found = event!.quotas!.find((quota) => quota.title === postQuota.title);
      expect(found).toBeTruthy();
      expect(found!.size).toBe(postQuota.size);
      expect(found!.order).toBe(index);
      expect(found!.price).toBe(postQuota.price);
    });

    expect(event!.questions!.length).toBe(createBody.questions.length);
    postBody.questions.forEach((postQuestion, index) => {
      const found = event!.questions!.find((question) => question.question === postQuestion.question);
      expect(found).toBeTruthy();
      expect(found!.type).toBe(postQuestion.type);
      expect(found!.question).toBe(postQuestion.question);
      expect(found!.required).toBe(postQuestion.required);
      expect(found!.public).toBe(postQuestion.public);
      expect(found!.options).toEqual(postQuestion.options);
      expect(found!.prices).toEqual(postQuestion.prices);
      expect(found!.order).toBe(index);
    });

    // verify the POST response against the GET one, should be equal
    const [getData, getResponse] = await fetchAdminEventDetails(createBody);
    expect(getResponse.statusCode).toBe(200);
    expect(createBody).toEqual(getData);
  });

  test("does not allow duplicate slugs", async () => {
    const duplicate = await testEvent();

    const createBody: EventCreateBody = {
      ...eventBody(),
      slug: duplicate.slug,
    };
    const [, createResponse] = await createEvent(createBody);
    expect(createResponse.statusCode).toBe(409);

    const countAfter = await Event.count({ where: { slug: duplicate.slug } });
    expect(countAfter).toBe(1);
  });

  test("can recreate deleted event slugs", async () => {
    const duplicate = await testEvent();
    await deleteEvent(duplicate);

    const createBody: EventCreateBody = {
      ...eventBody(),
      slug: duplicate.slug,
    };
    const [, createResponse] = await createEvent(createBody);
    expect(createResponse.statusCode).toBe(201);

    const countAfter = await Event.count({ where: { slug: duplicate.slug } });
    expect(countAfter).toBe(1);
  });

  test("validates event body", async () => {
    const createBody: EventCreateBody = eventBody();

    let [, response] = await createEvent({ ...createBody, title: "" });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, title: "A".repeat(300) });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, slug: "" });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, slug: "this has spaces!" });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, date: "today" });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, endDate: new Date().toISOString(), date: null });
    expect(response.statusCode).toBe(400);

    // End date cannot be before start date
    [, response] = await createEvent({
      ...createBody,
      date: new Date().toISOString(),
      endDate: moment().subtract(1, "day").toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Event must have either date or registration
    [, response] = await createEvent({
      ...createBody,
      date: null,
      endDate: null,
      registrationStartDate: null,
      registrationEndDate: null,
    });
    expect(response.statusCode).toBe(400);

    // Date must be set if end date is set
    [, response] = await createEvent({
      ...createBody,
      date: null,
      endDate: new Date().toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Registration dates must be both set or both null
    [, response] = await createEvent({
      ...createBody,
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: null,
    });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({
      ...createBody,
      registrationStartDate: null,
      registrationEndDate: new Date().toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Registration end date cannot be before start date
    [, response] = await createEvent({
      ...createBody,
      registrationStartDate: moment().toISOString(),
      registrationEndDate: moment().subtract(1, "day").toISOString(),
    });
    expect(response.statusCode).toBe(400);

    [, response] = await createEvent({ ...createBody, openQuotaSize: -5 });
    expect(response.statusCode).toBe(400);

    // TODO: test questions, quotas, languages validation

    // No event should have been created
    expect(await Event.count()).toBe(0);
  });

  test("normalizes options and prices to null when applicable", async () => {
    const options = testQuestionOptions();
    const prices = testQuestionPrices(options.length);
    const localizedOptions = options.map((option) => option.toUpperCase());
    const postBody: EventCreateBody = {
      ...eventBody(),
      questions: [
        {
          type: QuestionType.TEXT,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options,
          prices,
        },
        {
          type: QuestionType.SELECT,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options,
          prices,
        },
        {
          type: QuestionType.CHECKBOX,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options: null,
          prices,
        },
        {
          type: QuestionType.CHECKBOX,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options: [],
          prices,
        },
        {
          type: QuestionType.CHECKBOX,
          question: faker.lorem.words({ min: 1, max: 5 }),
          required: true,
          public: false,
          options,
          prices: prices.map(() => 0),
        },
      ],
      languages: {
        fi: {
          title: "",
          description: "",
          price: "",
          location: "",
          webpageUrl: "",
          facebookUrl: "",
          quotas: [],
          questions: [
            {
              question: "",
              options: localizedOptions,
            },
            {
              question: "",
              options: localizedOptions,
            },
            {
              question: "",
              options: null,
            },
            {
              question: "",
              options: [],
            },
            {
              question: "",
              options: localizedOptions,
            },
          ],
          verificationEmail: "",
        },
      },
    };

    const [createBody, createResponse] = await createEvent(postBody);

    expect(createResponse.statusCode).toBe(201);

    const event = await Event.findByPk(createBody.id, {
      include: [Question, Quota],
      order: [[Question, "order", "ASC"]],
    });

    expect(event!.questions).toHaveLength(5);
    // type: TEXT always has options: null + prices: null
    expect(event!.questions![0].type).toBe(QuestionType.TEXT);
    expect(event!.questions![0].options).toBe(null);
    expect(event!.questions![0].prices).toBe(null);
    // options and prices are kept as-is
    expect(event!.questions![1].type).toBe(QuestionType.SELECT);
    expect(event!.questions![1].options).toEqual(options);
    expect(event!.questions![1].prices).toEqual(prices);
    // options: null normalizes to options: null + prices: null
    expect(event!.questions![2].type).toBe(QuestionType.CHECKBOX);
    expect(event!.questions![2].options).toEqual(null);
    expect(event!.questions![2].prices).toEqual(null);
    // options: [] normalizes to options: null + prices: null
    expect(event!.questions![3].type).toBe(QuestionType.CHECKBOX);
    expect(event!.questions![3].options).toEqual(null);
    expect(event!.questions![3].prices).toEqual(null);
    // prices: [0, 0, ...] normalizes to prices: null
    expect(event!.questions![4].type).toBe(QuestionType.CHECKBOX);
    expect(event!.questions![4].options).toEqual(options);
    expect(event!.questions![4].prices).toEqual(null);
    // languages options normalization
    expect(event!.languages.fi).toBeTruthy();
    expect(event!.languages.fi.questions).toHaveLength(5);
    expect(event!.languages.fi.questions![0].options).toBe(null);
    expect(event!.languages.fi.questions![1].options).toEqual(localizedOptions);
    expect(event!.languages.fi.questions![2].options).toBe(null);
    expect(event!.languages.fi.questions![3].options).toBe(null);
    expect(event!.languages.fi.questions![4].options).toEqual(localizedOptions);
  });

  test("audit logs creations", async () => {
    const [event] = await createEvent(eventBody());

    const logs = await AuditLog.findAll();
    expect(logs.length).toBe(1);
    expect(logs[0]).toMatchObject({
      user: adminUser.email,
      action: AuditEvent.CREATE_EVENT,
      eventId: event.id,
      eventName: event.title,
    });
  });
});

describe("PATCH /api/admin/events/:id", () => {
  test("updates events", async () => {
    const event = await testEvent();

    const newBody = eventBody();

    const updateBody: EventUpdateBody = {
      ...newBody,
      updatedAt: event.updatedAt.toISOString(),
    };

    const [updateData, updateResponse] = await updateEvent(event, updateBody);

    expect(updateResponse.statusCode).toBe(200);
    expect(updateData).toEqual({
      id: event.id,
      ...updateBody,
      updatedAt: expect.any(String),
    });

    const [fetched] = await fetchAdminEventDetails(event);
    expect(fetched).toEqual(updateData);
  });

  test("validates event body", async () => {
    const event = await testEvent();
    const [before] = await fetchAdminEventDetails(event);

    const updateBody: EventUpdateBody = {
      ...eventBody(),
      updatedAt: event.updatedAt.toISOString(),
    };

    let [, response] = await updateEvent(event, { ...updateBody, title: "" });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, title: "A".repeat(300) });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, slug: "" });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, slug: "this has spaces!" });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, date: "today" });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, endDate: new Date().toISOString(), date: null });
    expect(response.statusCode).toBe(400);

    // End date cannot be before start date
    [, response] = await updateEvent(event, {
      ...updateBody,
      date: new Date().toISOString(),
      endDate: moment().subtract(1, "day").toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Event must have either date or registration
    [, response] = await updateEvent(event, {
      ...updateBody,
      date: null,
      endDate: null,
      registrationStartDate: null,
      registrationEndDate: null,
    });
    expect(response.statusCode).toBe(400);

    // Date must be set if end date is set
    [, response] = await updateEvent(event, {
      ...updateBody,
      date: null,
      endDate: new Date().toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Registration dates must be both set or both null
    [, response] = await updateEvent(event, {
      ...updateBody,
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: null,
    });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, {
      ...updateBody,
      registrationStartDate: null,
      registrationEndDate: new Date().toISOString(),
    });
    expect(response.statusCode).toBe(400);

    // Registration end date cannot be before start date
    [, response] = await updateEvent(event, {
      ...updateBody,
      registrationStartDate: moment().toISOString(),
      registrationEndDate: moment().subtract(1, "day").toISOString(),
    });
    expect(response.statusCode).toBe(400);

    [, response] = await updateEvent(event, { ...updateBody, openQuotaSize: -5 });
    expect(response.statusCode).toBe(400);

    // TODO: test questions, quotas, languages validation

    // Verify that nothing was changed
    const [after] = await fetchAdminEventDetails(event);
    expect(after).toEqual(before);
  });

  test("normalizes question options and prices on update", async () => {
    const options = testQuestionOptions();
    const prices = testQuestionPrices(options.length);
    const localizedOptions = options.map((option) => option.toUpperCase());

    // Create event with questions that have options and prices
    const event = await testEvent({ questionCount: 0, quotaCount: 1 });
    const [created, createResponse] = await updateEvent(event, {
      updatedAt: event.updatedAt.toISOString(),
      quotas: [{ id: event.quotas![0].id, title: event.quotas![0].title, size: event.quotas![0].size, price: 0 }],
      questions: [
        // Will be changed from CHECKBOX to TEXT -> options and prices should be nullified
        {
          type: QuestionType.CHECKBOX,
          question: "Question 1",
          required: false,
          public: false,
          options,
          prices,
        },
        // Will have options set to null -> should normalize options and prices to null
        {
          type: QuestionType.SELECT,
          question: "Question 2",
          required: false,
          public: false,
          options,
          prices,
        },
        // Will have options set to [] -> should normalize options and prices to null
        {
          type: QuestionType.CHECKBOX,
          question: "Question 3",
          required: false,
          public: false,
          options,
          prices,
        },
        // Will have all prices set to 0 -> should normalize prices to null but keep options
        {
          type: QuestionType.SELECT,
          question: "Question 4",
          required: false,
          public: false,
          options,
          prices,
        },
        // Will keep valid options and prices
        {
          type: QuestionType.CHECKBOX,
          question: "Question 5",
          required: false,
          public: false,
          options,
          prices,
        },
      ],
      languages: {
        fi: {
          title: "",
          description: "",
          price: "",
          location: "",
          webpageUrl: "",
          facebookUrl: "",
          quotas: [{ title: "" }],
          questions: [
            { question: "", options: localizedOptions },
            { question: "", options: localizedOptions },
            { question: "", options: localizedOptions },
            { question: "", options: localizedOptions },
            { question: "", options: localizedOptions },
          ],
          verificationEmail: "",
        },
      },
    });
    expect(createResponse.statusCode).toBe(200);
    expect(created.questions).toHaveLength(5);

    // Now update the event with changes that should trigger normalization
    const [, response] = await updateEvent(event, {
      updatedAt: created.updatedAt,
      quotas: [{ id: event.quotas![0].id, title: event.quotas![0].title, size: event.quotas![0].size, price: 0 }],
      questions: [
        // Change type from CHECKBOX to TEXT -> options and prices should be nullified
        {
          id: created.questions[0].id,
          type: QuestionType.TEXT,
          question: "Question 1",
          required: false,
          public: false,
          options,
          prices,
        },
        // Set options to null -> should normalize options and prices to null
        {
          id: created.questions[1].id,
          type: QuestionType.SELECT,
          question: "Question 2",
          required: false,
          public: false,
          options: null,
          prices,
        },
        // Set options to [] -> should normalize options and prices to null
        {
          id: created.questions[2].id,
          type: QuestionType.CHECKBOX,
          question: "Question 3",
          required: false,
          public: false,
          options: [],
          prices,
        },
        // Set all prices to 0 -> should normalize prices to null but keep options
        {
          id: created.questions[3].id,
          type: QuestionType.SELECT,
          question: "Question 4",
          required: false,
          public: false,
          options,
          prices: prices.map(() => 0),
        },
        // Keep valid options and prices unchanged
        {
          id: created.questions[4].id,
          type: QuestionType.CHECKBOX,
          question: "Question 5",
          required: false,
          public: false,
          options,
          prices,
        },
      ],
      languages: {
        fi: {
          title: "",
          description: "",
          price: "",
          location: "",
          webpageUrl: "",
          facebookUrl: "",
          quotas: [{ title: "" }],
          questions: [
            { question: "", options: localizedOptions },
            { question: "", options: null },
            { question: "", options: [] },
            { question: "", options: localizedOptions },
            { question: "", options: localizedOptions },
          ],
          verificationEmail: "",
        },
      },
    });

    expect(response.statusCode).toBe(200);

    // Verify normalization in database
    const dbEvent = await Event.findByPk(event.id, { include: [Question] });
    expect(dbEvent!.questions).toHaveLength(5);

    // Question 1: type changed to TEXT -> options and prices should be null
    expect(dbEvent!.questions![0].type).toBe(QuestionType.TEXT);
    expect(dbEvent!.questions![0].options).toBe(null);
    expect(dbEvent!.questions![0].prices).toBe(null);

    // Question 2: options set to null -> options and prices should be null
    expect(dbEvent!.questions![1].type).toBe(QuestionType.SELECT);
    expect(dbEvent!.questions![1].options).toBe(null);
    expect(dbEvent!.questions![1].prices).toBe(null);

    // Question 3: options set to [] -> options and prices should be null
    expect(dbEvent!.questions![2].type).toBe(QuestionType.CHECKBOX);
    expect(dbEvent!.questions![2].options).toBe(null);
    expect(dbEvent!.questions![2].prices).toBe(null);

    // Question 4: all prices set to 0 -> prices should be null but options kept
    expect(dbEvent!.questions![3].type).toBe(QuestionType.SELECT);
    expect(dbEvent!.questions![3].options).toEqual(options);
    expect(dbEvent!.questions![3].prices).toBe(null);

    // Question 5: valid options and prices kept unchanged
    expect(dbEvent!.questions![4].type).toBe(QuestionType.CHECKBOX);
    expect(dbEvent!.questions![4].options).toEqual(options);
    expect(dbEvent!.questions![4].prices).toEqual(prices);

    // Verify language normalization
    expect(dbEvent!.languages.fi).toBeTruthy();
    expect(dbEvent!.languages.fi.questions).toHaveLength(5);
    expect(dbEvent!.languages.fi.questions![0].options).toBe(null);
    expect(dbEvent!.languages.fi.questions![1].options).toBe(null);
    expect(dbEvent!.languages.fi.questions![2].options).toBe(null);
    expect(dbEvent!.languages.fi.questions![3].options).toEqual(localizedOptions);
    expect(dbEvent!.languages.fi.questions![4].options).toEqual(localizedOptions);
  });

  test("does not allow duplicate slugs", async () => {
    const event1 = await testEvent();
    const event2 = await testEvent();

    const [, response] = await updateEvent(event2, {
      slug: event1.slug,
      updatedAt: event2.updatedAt.toISOString(),
    });
    expect(response.statusCode).toBe(409);
  });

  test("checks moving signups to queue", async () => {
    const event = await testEvent({ quotaCount: 1, quotaOverrides: { size: 3 } }, { openQuotaSize: 3 });
    await testSignups({ event, count: 5, confirmed: true });

    const [before] = await fetchAdminEventDetails(event);
    let { updatedAt } = before;

    let [, response] = await updateEvent(event, {
      openQuotaSize: 1,
      updatedAt,
    });
    expect(response.statusCode).toBe(409);

    [, response] = await updateEvent(event, {
      quotas: [{ ...before.quotas[0], size: 1 }],
      updatedAt,
    });
    expect(response.statusCode).toBe(409);

    // Verify that nothing was changed
    const [after] = await fetchAdminEventDetails(event);
    expect(after).toEqual(before);

    // Reducing and moving between normal/open quota should be legal, though
    [{ updatedAt }, response] = await updateEvent(event, {
      openQuotaSize: 2,
      updatedAt,
    });
    expect(response.statusCode).toBe(200);

    [{ updatedAt }, response] = await updateEvent(event, {
      quotas: [{ ...before.quotas[0], size: 2 }],
      openQuotaSize: 3,
      updatedAt,
    });
    expect(response.statusCode).toBe(200);

    // Should also work with extra parameter
    [{ updatedAt }, response] = await updateEvent(event, {
      quotas: [{ ...before.quotas[0], size: 1 }],
      openQuotaSize: 0,
      moveSignupsToQueue: true,
      updatedAt,
    });
    expect(response.statusCode).toBe(200);
  });

  test("checks updatedAt for conflicts", async () => {
    const event = await testEvent();
    const [before] = await fetchAdminEventDetails(event);

    const [, response] = await updateEvent(event, {
      title: "New title",
      updatedAt: moment().subtract(1, "day").toISOString(),
    });
    expect(response.statusCode).toBe(409);

    // Verify that nothing was changed
    const [after] = await fetchAdminEventDetails(event);
    expect(after).toEqual(before);
  });

  test("audit logs updates", async () => {
    const event = await testEvent({}, { draft: true });
    let updatedAt = event.updatedAt.toISOString();

    [{ updatedAt }] = await updateEvent(event, {
      title: "Foo",
      updatedAt,
    });
    [{ updatedAt }] = await updateEvent(event, {
      draft: false,
      updatedAt,
    });
    [{ updatedAt }] = await updateEvent(event, {
      draft: true,
      updatedAt,
    });

    const logs = await AuditLog.findAll({ order: [["createdAt", "ASC"]] });
    expect(logs.length).toBe(3);
    expect(logs[0]).toMatchObject({
      user: adminUser.email,
      action: AuditEvent.EDIT_EVENT,
      eventId: event.id,
      eventName: "Foo",
    });
    expect(logs[1]).toMatchObject({
      user: adminUser.email,
      action: AuditEvent.PUBLISH_EVENT,
      eventId: event.id,
      eventName: "Foo",
    });
    expect(logs[2]).toMatchObject({
      user: adminUser.email,
      action: AuditEvent.UNPUBLISH_EVENT,
      eventId: event.id,
      eventName: "Foo",
    });
  });
});

describe("DELETE /api/admin/events/:id", () => {
  test("deletes events", async () => {
    const event = await testEvent();

    const [, response] = await deleteEvent(event);
    expect(response.statusCode).toBe(204);

    expect(await Event.count()).toBe(0);
  });

  test("audit logs deletions", async () => {
    const event = await testEvent();

    const [, response] = await deleteEvent(event);
    expect(response.statusCode).toBe(204);

    const logs = await AuditLog.findAll();
    expect(logs.length).toBe(1);
    expect(logs[0]).toMatchObject({
      user: adminUser.email,
      action: AuditEvent.DELETE_EVENT,
      eventId: event.id,
      eventName: event.title,
    });
  });
});
