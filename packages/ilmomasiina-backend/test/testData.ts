import { faker } from "@faker-js/faker";
import { range } from "lodash";
import moment from "moment";
import { Optional, UniqueConstraintError } from "sequelize";

import { PaymentMode, QuestionID, QuestionType } from "@tietokilta/ilmomasiina-models";
import config from "../src/config";
import { Answer, AnswerCreationAttributes } from "../src/models/answer";
import { Event, EventAttributes } from "../src/models/event";
import { Question, QuestionAttributes, QuestionCreationAttributes } from "../src/models/question";
import { Quota, QuotaAttributes } from "../src/models/quota";
import { Signup, SignupAttributes, SignupCreationAttributes } from "../src/models/signup";
import { User } from "../src/models/user";
import { computePrice, getQuotaProducts, validateAnswersAndGetProducts } from "../src/routes/signups/updateSignup";

export function testUser() {
  return User.create({
    email: faker.internet.email(),
    password: faker.internet.password(),
  });
}

type TestEventOptions = {
  hasDate?: boolean;
  inPast?: number | false;
  hasSignup?: boolean;
  signupState?: "not-open" | "open" | "closed";
  questionCount?: number;
  quotaCount?: number;
  quotaOverrides?: Partial<QuotaAttributes>;
  questionOverrides?: Partial<QuestionAttributes>;
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
    payments: faker.helpers.arrayElement(Object.values(PaymentMode)),
    preferredFrontend: "default",
    verificationEmail: faker.lorem.paragraphs({ min: 1, max: 5 }),
    defaultLanguage: "en",
    languages: {},
  };
  if (hasDate) {
    if (inPast) {
      attribs.endDate = faker.date.recent({ refDate: moment().subtract(inPast, "days").toDate() });
      attribs.date = faker.date.recent({ refDate: attribs.endDate });
    } else {
      attribs.date = faker.date.soon();
      attribs.endDate = faker.date.soon({ refDate: attribs.date });
    }
  }
  if (hasSignup) {
    if (inPast && signupState === "closed") {
      attribs.registrationEndDate = faker.date.recent({
        refDate: moment().subtract(inPast, "days").toDate(),
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

export function testQuestionOptions() {
  return faker.helpers.multiple(() => faker.lorem.words({ min: 1, max: 3 }), {
    count: { min: 1, max: 8 },
  });
}

export function testQuestionPrices(optionCount: number) {
  // Disallow zero so that there is no chance of all-zero prices. Zero will be tested manually.
  return range(optionCount).map(() => faker.number.int({ min: 1, max: 10000 }));
}

export function testQuestionAttributes() {
  const attribs: Omit<QuestionCreationAttributes, "eventId" | "order"> = {
    question: faker.lorem.words({ min: 1, max: 5 }),
    type: faker.helpers.arrayElement(Object.values(QuestionType)),
    required: faker.datatype.boolean(),
    public: faker.datatype.boolean(),
  };
  if (attribs.type === QuestionType.SELECT || attribs.type === QuestionType.CHECKBOX) {
    attribs.options = testQuestionOptions();
    attribs.prices = testQuestionPrices(attribs.options.length);
  }
  return attribs;
}

export function testQuotaAttributes() {
  return {
    title: faker.lorem.words({ min: 1, max: 5 }),
    size: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), { probability: 0.9 }) ?? null,
    price: faker.number.int({ min: 1, max: 100000 }),
  };
}

/**
 * Creates and saves a randomized test event.
 *
 * @param options Options for the event generation.
 * @param overrides Fields to set on the event right before saving.
 * @returns The created event, with `questions` and `quotas` populated.
 */
export async function testEvent(options: TestEventOptions = {}, overrides: Partial<EventAttributes> = {}) {
  const { questionCount = faker.number.int({ min: 1, max: 5 }), quotaCount = faker.number.int({ min: 1, max: 4 }) } =
    options;
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
    range(questionCount).map((i) => {
      const values = {
        eventId: event.id,
        order: i,
        ...testQuestionAttributes(),
        ...options.questionOverrides,
      };
      return { ...values, ...Question.normalizeOptions(values) };
    }),
  );
  event.quotas = await Quota.bulkCreate(
    range(quotaCount).map((i) => ({
      eventId: event.id,
      order: i,
      ...testQuotaAttributes(),
      ...options.quotaOverrides,
    })),
  );
  for (const quota of event.quotas) {
    // Populate backlink to event
    quota.event = event;
  }
  return event;
}

type TestSignupsOptions = {
  event: Event;
  count?: number;
  expired?: boolean;
  confirmed?: boolean;
  overrides?: Partial<SignupAttributes>;
  answers?: Record<QuestionID, string | string[]>;
};

/** Generates test signups to the given event.
 *
 * If `confirmed` is set, all signups will be confirmed. If `expired` is set, all signups will be
 * unconfirmed and expired.
 *
 * For confirmed signups, all fields are chosen randomly among available options and valid values,
 * but `overrides` and `answers` can be used to set specific values.
 */
export async function testSignups({
  event,
  count = faker.number.int({ min: 1, max: 40 }),
  expired = false,
  confirmed = expired ? false : undefined,
  overrides = {},
  answers = {},
}: TestSignupsOptions): Promise<Signup[]> {
  if (!event.quotas || !event.questions) {
    throw new Error("testSignups() expects event.quotas and event.questions to be populated");
  }
  if (!event.quotas.length) {
    throw new Error("testSignups() needs at least one existing quota");
  }
  const signupValues = range(count).map((): SignupCreationAttributes => {
    const signup: SignupCreationAttributes = {
      quotaId: faker.helpers.arrayElement(event.quotas!).id,
    };
    if (expired) {
      // Expired signup (never confirmed)
      signup.createdAt = faker.date.recent({
        refDate: moment().subtract(config.signupConfirmMins, "minutes").toDate(),
      });
    } else if (confirmed ?? faker.datatype.boolean({ probability: 0.8 })) {
      // Confirmed signup
      signup.confirmedAt = faker.date.recent();
      signup.createdAt = faker.date.between({
        from: moment(signup.confirmedAt).subtract(config.signupConfirmMins, "minutes").toDate(),
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
        from: moment().subtract(config.signupConfirmMins, "minutes").toDate(),
        to: new Date(),
      });
    }
    return {
      ...signup,
      ...overrides,
    };
  });
  // Generate answers and update signups with prices.
  const answerValues = signupValues.map((signup) => {
    if (!signup.confirmedAt) return [];
    const answersForSignup = event.questions!.map((question) => {
      const answer: Omit<AnswerCreationAttributes, "signupId"> = {
        questionId: question.id,
        answer: "",
      };
      // Generate answer value based on question type and other constraints
      if (answers[question.id] !== undefined) {
        answer.answer = answers[question.id];
      } else if (question.type === QuestionType.TEXT) {
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
    const quota = event.quotas!.find((q) => q.id === signup.quotaId)!;
    const products = [
      ...getQuotaProducts(quota),
      ...validateAnswersAndGetProducts(event, answersForSignup, true).answerProducts,
    ];
    Object.assign(signup, computePrice(products));
    return answersForSignup;
  });
  // Actually create signups.
  const signups = await Signup.bulkCreate(signupValues);
  // Add signup IDs to answers and create them.
  // (Note: This would not work in MySQL, since it doesn't return us the IDs from Signup.bulkCreate.)
  await Answer.bulkCreate(
    answerValues.flatMap((answersForSignup, i) =>
      answersForSignup.map((ans) => ({
        ...ans,
        signupId: signups[i].id,
      })),
    ),
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
