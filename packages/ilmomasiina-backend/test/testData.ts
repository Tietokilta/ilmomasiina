import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { UniqueConstraint } from 'drizzle-orm/pg-core';
import { range } from 'lodash';
import moment from 'moment';

import { questionTypes, QuotaID } from '@tietokilta/ilmomasiina-models';
import { EventAttributes, SignupAttributes } from '@tietokilta/ilmomasiina-models/dist/models';
import { db } from '../src/drizzle/db';
import {
  answerTable,
  eventTable, questionTable, quotaTable, signupTable, userTable,
} from '../src/drizzle/schema';

export async function testUser() {
  return db.insert(userTable).values({
    email: faker.internet.email(),
    password: faker.internet.password(),
  }).returning().execute()
    .then((rows) => rows[0]);
}

type TestEventOptions = {
  hasDate?: boolean;
  inPast?: boolean;
  hasSignup?: boolean;
  signupState?: 'not-open' | 'open' | 'closed';
  questionCount?: number;
  quotaCount?: number;
  signupCount?: number;
};
function generateDate(hasDate: boolean, inPast: boolean) {
  if (hasDate) {
    if (inPast) {
      const endDate = faker.date.recent({ refDate: moment().subtract(14, 'days').toDate() });
      return {
        endDate,
        date: faker.date.recent({ refDate: endDate }),
      };
    }
    const date = faker.date.soon();
    return {
      date,
      endDate: faker.date.soon({ refDate: date }),
    };
  }
  return {
    date: null,
    endDate: null,
  };
}
function generateRegistrationDates(hasSignup: boolean, inPast: boolean, signupState: TestEventOptions['signupState']) {
  if (hasSignup) {
    if (signupState === 'closed') {
      if (inPast) {
        const registrationEndDate = faker.date.recent({ refDate: moment().subtract(14, 'days').toDate() });
        return {
          registrationEndDate,
          registrationStartDate: faker.date.recent({ refDate: registrationEndDate }),
        };
      }
      const registrationEndDate = faker.date.recent();
      return {
        registrationEndDate,
        registrationStartDate: faker.date.recent({ refDate: registrationEndDate }),
      };
    }
    if (signupState === 'not-open') {
      const registrationStartDate = faker.date.soon();
      return {
        registrationStartDate,
        registrationEndDate: faker.date.soon({ refDate: registrationStartDate }),
      };
    }
    const registrationStartDate = faker.date.recent();
    return {
      registrationStartDate,
      registrationEndDate: faker.date.soon(),
    };
  }
  return {
    registrationStartDate: null,
    registrationEndDate: null,
  };
}
/**
 * Creates and saves a randomized test event.
 *
 * @param options Options for the event generation.
 * @param overrides Fields to set on the event right before saving.
 * @returns The created event, with `questions` and `quotas` populated.
 */
export async function testEvent({
  hasDate = true,
  inPast = false,
  hasSignup = true,
  signupState = inPast ? 'closed' : 'open',
  questionCount = faker.number.int({ min: 1, max: 5 }),
  quotaCount = faker.number.int({ min: 1, max: 4 }),
}: TestEventOptions = {}, overrides: Partial<EventAttributes> = {}) {
  const title = faker.lorem.words({ min: 1, max: 5 });
  const { endDate, date } = generateDate(hasDate, inPast);
  const { registrationEndDate, registrationStartDate } = generateRegistrationDates(hasSignup, inPast, signupState);
  const event = {
    title,
    slug: faker.helpers.slugify(title),
    description: faker.lorem.paragraphs({ min: 1, max: 5 }),
    price: faker.finance.amount({ symbol: '€' }),
    location: faker.location.streetAddress(),
    facebookUrl: faker.internet.url(),
    webpageUrl: faker.internet.url(),
    category: faker.lorem.words({ min: 1, max: 2 }),
    draft: false,
    emailQuestion: faker.datatype.boolean(),
    nameQuestion: faker.datatype.boolean(),
    verificationEmail: faker.lorem.paragraphs({ min: 1, max: 5 }),
    registrationStartDate,
    registrationEndDate,
    signupsPublic: false,
    openQuotaSize: 0,
    date,
    endDate,
  };
  let eventId: string;
  Object.assign(event, overrides);
  try {
    eventId = (await db.insert(eventTable).values([event]).returning({ id: eventTable.id }).execute()
    )[0].id;
  } catch (err) {
    if (err instanceof UniqueConstraint) {
      // Slug must be unique... this ought to be enough.
      event.slug += faker.string.alphanumeric(8);
      eventId = (await db.insert(eventTable).values([event]).returning({ id: eventTable.id }).execute())[0].id;
    } else {
      throw err;
    }
  }
  const questions = await db.insert(questionTable).values(range(questionCount).map((i) => {
    const questionType = faker.helpers.arrayElement(questionTypes);
    const question = {
      eventId,
      order: i,
      question: faker.lorem.words({ min: 1, max: 5 }),
      type: questionType,
      required: faker.datatype.boolean(),
      public: faker.datatype.boolean(),
      options: questionType === 'select' || questionType === 'checkbox' ? faker.helpers.multiple(
        () => faker.lorem.words({ min: 1, max: 3 }),
        { count: { min: 1, max: 8 } },
      ) : undefined,
    };
    return question;
  })).returning().execute();
  const quotas = await db.insert(quotaTable).values(range(quotaCount).map((i) => ({
    eventId,
    order: i,
    title: faker.lorem.words({ min: 1, max: 5 }),
    size: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), { probability: 0.9 }) ?? null,
  }))).returning().execute();
  return {
    ...event, questions, quotas, id: eventId,
  };
}

type TestSignupsOptions = {
  count?: number;
  quotaId?: QuotaID;
  expired?: boolean;
  confirmed?: boolean;
};

function generateSignupCreatedAtConfirmedAt(expired: boolean, confirmed: boolean) {
  if (expired) {
    return {
      createdAt: faker.date.recent({ refDate: moment().subtract(30, 'minutes').toDate() }),
      confirmedAt: null,
    };
  }
  if (confirmed) {
    const confirmedAt = faker.date.recent();
    return {
      confirmedAt,
      createdAt: faker.date.between({
        from: moment(confirmedAt).subtract(30, 'minutes').toDate(),
        to: confirmedAt,
      }),
    };
  }
  return {
    createdAt: faker.date.between({
      from: moment().subtract(30, 'minutes').toDate(),
      to: new Date(),
    }),
    confirmedAt: null,
  };
}
function generateNameAndEmail(confirmed: boolean, nameQuestion: boolean, emailQuestion: boolean) {
  if (!confirmed) {
    return {
      firstName: undefined, lastName: undefined, email: undefined, namePublic: undefined,
    };
  }
  const name = nameQuestion ? {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    namePublic: faker.datatype.boolean(),
  } : {
    firstName: null,
    lastName: null,
    namePublic: false,
  };
  const email = emailQuestion ? {
    email: faker.internet.email({
      firstName: name.firstName ?? undefined,
      lastName: name.lastName ?? undefined,
    }),
  } : {
    email: null,
  };
  return {
    ...name,
    ...email,
  };
}
export type TestEvent = Awaited<ReturnType<typeof testEvent>>;
export async function testSignups(
  event: TestEvent,
  {
    count = faker.number.int({ min: 1, max: 40 }),
    quotaId,
    expired = false,
    confirmed = expired ? false : undefined,
  }: TestSignupsOptions = {},
  overrides: Partial<SignupAttributes> = {},
) {
  if (!event.quotas || !event.questions) {
    throw new Error('testSignups() expects event.quotas and event.questions to be populated');
  }
  if (!event.quotas.length) {
    throw new Error('testSignups() needs at least one existing quota');
  }
  const signups = await db.insert(signupTable).values(range(count).map(() => {
    const { createdAt, confirmedAt } = generateSignupCreatedAtConfirmedAt(expired, confirmed ?? faker.datatype.boolean({ probability: 0.8 }));
    const {
      firstName, lastName, namePublic, email,
    } = generateNameAndEmail(
      confirmedAt !== null,
      event.nameQuestion,
      event.emailQuestion,
    );
    const signup = {
      quotaId: quotaId ?? faker.helpers.arrayElement(event.quotas!).id,
      firstName,
      lastName,
      namePublic,
      email,
      createdAt,
      confirmedAt,
    };
    return {
      ...signup,
      ...overrides,
    };
  })).returning().execute();
  if (signups.some((signup) => signup.confirmedAt)) {
    await db.insert(answerTable).values(signups.flatMap((signup) => {
      if (!signup.confirmedAt) return [];
      return event.questions.map((question) => {
        const answer = {
          questionId: question.id,
          signupId: signup.id,
          answer: '' as string | string[],
        };
        // Generate answer value based on question type and other constraints
        if (question.type === 'text') {
          answer.answer = faker.helpers.maybe(
            () => faker.lorem.words({ min: 1, max: 3 }),
            { probability: question.required ? 1 : 0.5 },
          ) ?? '';
        } else if (question.type === 'textarea') {
          answer.answer = faker.helpers.maybe(
            () => faker.lorem.sentences({ min: 1, max: 2 }),
            { probability: question.required ? 1 : 0.5 },
          ) ?? '';
        } else if (question.type === 'number') {
          answer.answer = faker.helpers.maybe(
            () => faker.number.int().toString(),
            { probability: question.required ? 1 : 0.5 },
          ) ?? '';
        } else if (question.type === 'select') {
          answer.answer = faker.helpers.maybe(
            () => faker.helpers.arrayElement(question.options ?? [null]),
            { probability: question.required ? 1 : 0.5 },
          ) ?? '';
        } else if (question.type === 'checkbox') {
          answer.answer = faker.helpers.arrayElements(
            question.options ?? [],
            { min: question.required ? 1 : 0, max: Infinity },
          );
        } else {
          question.type satisfies never;
        }
        return answer;
      });
    }));
  }
  return signups;
}
export async function fetchSignups(event: TestEvent) {
  if (!event.quotas) {
    throw new Error('fetchSignups() expects event.quotas and event.questions to be populated');
  }
  if (!event.quotas.length) {
    throw new Error('fetchSignups() needs at least one existing quota');
  }
  return db.query.quotaTable.findMany({
    where: eq(quotaTable.eventId, event.id),
    with: {
      signups: {
        with: {
          answers: true,
        },
      },
    },
  });
}
