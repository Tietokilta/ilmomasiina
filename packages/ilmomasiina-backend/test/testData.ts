import { faker } from "@faker-js/faker";
import { range } from "lodash";
import moment from "moment";
import { Optional, UniqueConstraintError } from "sequelize";

import { QuestionType, QuotaID } from "@tietokilta/ilmomasiina-models";
import { EventAttributes, SignupAttributes } from "@tietokilta/ilmomasiina-models/dist/models";
import { Answer, AnswerCreationAttributes } from "../src/models/answer";
import { Event } from "../src/models/event";
import { Question, QuestionCreationAttributes } from "../src/models/question";
import { Quota } from "../src/models/quota";
import { Signup, SignupCreationAttributes } from "../src/models/signup";
import { User } from "../src/models/user";

export function testUser() {
  return User.create({
    email: faker.internet.email(),
    password: faker.internet.password(),
  });
}

type TestEventOptions = {
  hasDate?: boolean;
  inPast?: boolean;
  hasSignup?: boolean;
  signupState?: "not-open" | "open" | "closed";
  questionCount?: number;
  quotaCount?: number;
  signupCount?: number;
};

type TestEventAttribs = Optional<EventAttributes, "id" | "updatedAt">;

/** Generates randomized attributes for a test event. The event is not saved.
 *
 * @param options Options for the event generation.
 * @returns Event attributes. Does not include questions or quotas.
 */
export function testEventAttributes({
  hasDate = true,
  inPast = false,
  hasSignup = true,
  signupState = inPast ? "closed" : "open",
}: TestEventOptions = {}) {
  const title = faker.lorem.words({ min: 1, max: 5 });
  const attribs: TestEventAttribs = {
    title,
    slug: faker.helpers.slugify(title),
    date: null,
    endDate: null,
    registrationStartDate: null,
    registrationEndDate: null,
    openQuotaSize: hasSignup ? faker.number.int({ min: 0, max: 50 }) : 0,
    description: faker.lorem.paragraphs({ min: 1, max: 5 }),
    price: faker.finance.amount({ symbol: "€" }),
    location: faker.location.streetAddress(),
    facebookUrl: faker.internet.url(),
    webpageUrl: faker.internet.url(),
    category: faker.lorem.words({ min: 1, max: 2 }),
    draft: false,
    listed: true,
    nameQuestion: true, // to be tested separately
    emailQuestion: true,
    signupsPublic: false,
    verificationEmail: faker.lorem.paragraphs({ min: 1, max: 5 }),
  };
  if (hasDate) {
    if (inPast) {
      attribs.endDate = faker.date.recent({ refDate: moment().subtract(14, "days").toDate() });
      attribs.date = faker.date.recent({ refDate: attribs.endDate });
    } else {
      attribs.date = faker.date.soon();
      attribs.endDate = faker.date.soon({ refDate: attribs.date });
    }
  }
  if (hasSignup) {
    if (inPast && signupState === "closed") {
      attribs.registrationEndDate = faker.date.recent({
        refDate: moment().subtract(14, "days").toDate(),
      });
      attribs.registrationStartDate = faker.date.recent({ refDate: attribs.registrationEndDate });
    } else if (signupState === "closed") {
      attribs.registrationEndDate = faker.date.recent();
      attribs.registrationStartDate = faker.date.recent({ refDate: attribs.registrationEndDate });
    } else if (signupState === "not-open") {
      attribs.registrationStartDate = faker.date.soon();
      attribs.registrationEndDate = faker.date.soon({ refDate: attribs.registrationStartDate });
    } else {
      attribs.registrationStartDate = faker.date.recent();
      attribs.registrationEndDate = faker.date.soon();
    }
  }
  return attribs;
}

export function testQuestionAttributes() {
  const attribs: Omit<QuestionCreationAttributes, "eventId" | "order"> = {
    question: faker.lorem.words({ min: 1, max: 5 }),
    type: faker.helpers.arrayElement(Object.values(QuestionType)),
    required: faker.datatype.boolean(),
    public: faker.datatype.boolean(),
  };
  if (attribs.type === QuestionType.SELECT || attribs.type === QuestionType.CHECKBOX) {
    attribs.options = faker.helpers.multiple(() => faker.lorem.words({ min: 1, max: 3 }), {
      count: { min: 1, max: 8 },
    });
  }
  return attribs;
}

export function testQuotaAttributes() {
  return {
    title: faker.lorem.words({ min: 1, max: 5 }),
    size:
      faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), { probability: 0.9 }) ??
      null,
  };
}

/**
 * Creates and saves a randomized test event.
 *
 * @param options Options for the event generation.
 * @param overrides Fields to set on the event right before saving.
 * @returns The created event, with `questions` and `quotas` populated.
 */
export async function testEvent(
  options: TestEventOptions = {},
  overrides: Partial<EventAttributes> = {},
) {
  const {
    questionCount = faker.number.int({ min: 1, max: 5 }),
    quotaCount = faker.number.int({ min: 1, max: 4 }),
  } = options;
  const event = new Event(testEventAttributes(options));
  event.set(overrides);
  try {
    await event.save();
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      // Slug must be unique... this ought to be enough.
      event.slug += faker.string.alphanumeric(8);
      await event.save();
    } else {
      throw err;
    }
  }
  event.questions = await Question.bulkCreate(
    range(questionCount).map((i) => ({
      eventId: event.id,
      order: i,
      ...testQuestionAttributes(),
    })),
  );
  event.quotas = await Quota.bulkCreate(
    range(quotaCount).map((i) => ({
      eventId: event.id,
      order: i,
      ...testQuotaAttributes(),
    })),
  );
  return event;
}

type TestSignupsOptions = {
  count?: number;
  quotaId?: QuotaID;
  expired?: boolean;
  confirmed?: boolean;
};

export async function testSignups(
  event: Event,
  {
    count = faker.number.int({ min: 1, max: 40 }),
    quotaId,
    expired = false,
    confirmed = expired ? false : undefined,
  }: TestSignupsOptions = {},
  overrides: Partial<SignupAttributes> = {},
) {
  if (!event.quotas || !event.questions) {
    throw new Error("testSignups() expects event.quotas and event.questions to be populated");
  }
  if (!event.quotas.length) {
    throw new Error("testSignups() needs at least one existing quota");
  }
  const signups = await Signup.bulkCreate(
    range(count).map(() => {
      const signup: SignupCreationAttributes = {
        quotaId: quotaId ?? faker.helpers.arrayElement(event.quotas!).id,
      };
      if (expired) {
        // Expired signup (never confirmed)
        signup.createdAt = faker.date.recent({
          refDate: moment().subtract(30, "minutes").toDate(),
        });
      } else if (confirmed ?? faker.datatype.boolean({ probability: 0.8 })) {
        // Confirmed signup
        signup.confirmedAt = faker.date.recent();
        signup.createdAt = faker.date.between({
          from: moment(signup.confirmedAt).subtract(30, "minutes").toDate(),
          to: signup.confirmedAt,
        });
        if (event.nameQuestion) {
          signup.firstName = faker.person.firstName();
          signup.lastName = faker.person.lastName();
          signup.namePublic = faker.datatype.boolean();
        }
        if (event.emailQuestion) {
          signup.email = faker.internet.email({
            firstName: signup.firstName ?? undefined,
            lastName: signup.lastName ?? undefined,
          });
        }
      } else {
        // Unconfirmed signup
        signup.createdAt = faker.date.between({
          from: moment().subtract(30, "minutes").toDate(),
          to: new Date(),
        });
      }
      return {
        ...signup,
        ...overrides,
      };
    }),
  );
  await Answer.bulkCreate(
    signups.flatMap((signup) => {
      if (!signup.confirmedAt) return [];
      return event.questions!.map((question) => {
        const answer: AnswerCreationAttributes = {
          questionId: question.id,
          signupId: signup.id,
          answer: "",
        };
        // Generate answer value based on question type and other constraints
        if (question.type === QuestionType.TEXT) {
          answer.answer =
            faker.helpers.maybe(() => faker.lorem.words({ min: 1, max: 3 }), {
              probability: question.required ? 1 : 0.5,
            }) ?? "";
        } else if (question.type === QuestionType.TEXT_AREA) {
          answer.answer =
            faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 2 }), {
              probability: question.required ? 1 : 0.5,
            }) ?? "";
        } else if (question.type === QuestionType.NUMBER) {
          answer.answer =
            faker.helpers.maybe(() => faker.number.int().toString(), {
              probability: question.required ? 1 : 0.5,
            }) ?? "";
        } else if (question.type === QuestionType.SELECT) {
          answer.answer =
            faker.helpers.maybe(() => faker.helpers.arrayElement(question.options!), {
              probability: question.required ? 1 : 0.5,
            }) ?? "";
        } else if (question.type === QuestionType.CHECKBOX) {
          answer.answer = faker.helpers.arrayElements(question.options!, {
            min: question.required ? 1 : 0,
            max: Infinity,
          });
        } else {
          question.type satisfies never;
        }
        return answer;
      });
    }),
  );
  return signups;
}

export async function fetchSignups(event: Event) {
  if (!event.quotas) {
    throw new Error("fetchSignups() expects event.quotas and event.questions to be populated");
  }
  if (!event.quotas.length) {
    throw new Error("fetchSignups() needs at least one existing quota");
  }
  await Promise.all(
    event.quotas.map(async (quota) => {
      // eslint-disable-next-line no-param-reassign
      quota.signups = await quota.getSignups({
        include: [Answer],
      });
    }),
  );
}
