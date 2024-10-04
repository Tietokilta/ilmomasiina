import { faker } from "@faker-js/faker";
import { range } from "lodash";
import moment from "moment";
import { UniqueConstraintError } from "sequelize";

import { QuestionType, QuotaID } from "@tietokilta/ilmomasiina-models";
import { EventAttributes, SignupAttributes } from "@tietokilta/ilmomasiina-models/dist/models";
import config from "../src/config";
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

/**
 * Creates and saves a randomized test event.
 *
 * @param options Options for the event generation.
 * @param overrides Fields to set on the event right before saving.
 * @returns The created event, with `questions` and `quotas` populated.
 */
export async function testEvent(
  {
    hasDate = true,
    inPast = false,
    hasSignup = true,
    signupState = inPast ? "closed" : "open",
    questionCount = faker.number.int({ min: 1, max: 5 }),
    quotaCount = faker.number.int({ min: 1, max: 4 }),
  }: TestEventOptions = {},
  overrides: Partial<EventAttributes> = {},
) {
  const title = faker.lorem.words({ min: 1, max: 5 });
  const event = new Event({
    title,
    slug: faker.helpers.slugify(title),
    description: faker.lorem.paragraphs({ min: 1, max: 5 }),
    price: faker.finance.amount({ symbol: "€" }),
    location: faker.location.streetAddress(),
    facebookUrl: faker.internet.url(),
    webpageUrl: faker.internet.url(),
    category: faker.lorem.words({ min: 1, max: 2 }),
    draft: false,
    verificationEmail: faker.lorem.paragraphs({ min: 1, max: 5 }),
  });
  if (hasDate) {
    if (inPast) {
      event.endDate = faker.date.recent({
        refDate: moment().subtract(14, "days").toDate(),
      });
      event.date = faker.date.recent({ refDate: event.endDate });
    } else {
      event.date = faker.date.soon();
      event.endDate = faker.date.soon({ refDate: event.date });
    }
  }
  if (hasSignup) {
    if (inPast && signupState === "closed") {
      event.registrationEndDate = faker.date.recent({
        refDate: moment().subtract(14, "days").toDate(),
      });
      event.registrationStartDate = faker.date.recent({
        refDate: event.registrationEndDate,
      });
    } else if (signupState === "closed") {
      event.registrationEndDate = faker.date.recent();
      event.registrationStartDate = faker.date.recent({
        refDate: event.registrationEndDate,
      });
    } else if (signupState === "not-open") {
      event.registrationStartDate = faker.date.soon();
      event.registrationEndDate = faker.date.soon({
        refDate: event.registrationStartDate,
      });
    } else {
      event.registrationStartDate = faker.date.recent();
      event.registrationEndDate = faker.date.soon();
    }
  }
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
      const question: QuestionCreationAttributes = {
        eventId: event.id,
        order: i,
        question: faker.lorem.words({ min: 1, max: 5 }),
        type: faker.helpers.arrayElement(Object.values(QuestionType)),
        required: faker.datatype.boolean(),
        public: faker.datatype.boolean(),
      };
      if (question.type === QuestionType.SELECT || question.type === QuestionType.CHECKBOX) {
        question.options = faker.helpers.multiple(() => faker.lorem.words({ min: 1, max: 3 }), {
          count: { min: 1, max: 8 },
        });
      }
      return question;
    }),
  );
  event.quotas = await Quota.bulkCreate(
    range(quotaCount).map((i) => ({
      eventId: event.id,
      order: i,
      title: faker.lorem.words({ min: 1, max: 5 }),
      size:
        faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), {
          probability: 0.9,
        }) ?? null,
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
