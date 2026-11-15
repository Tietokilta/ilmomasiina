import { defineRelations } from "drizzle-orm";

import { ACTIVE_PAYMENT_STATUSES, schema } from "./schema";

const notDeleted = { deletedAt: { isNull: true } } as const;

// Events, quotas, questions and answers are soft-deleted. Relations to them only include rows that
// have not been deleted, like Sequelize's paranoid mode did. Signups are filtered explicitly in queries.
export const relations = defineRelations(schema, (r) => ({
  event: {
    questions: r.many.question({ from: r.event.id, to: r.question.eventId, where: notDeleted }),
    quotas: r.many.quota({ from: r.event.id, to: r.quota.eventId, where: notDeleted }),
  },
  quota: {
    event: r.one.event({ from: r.quota.eventId, to: r.event.id, where: notDeleted }),
    signups: r.many.signup({ from: r.quota.id, to: r.signup.quotaId }),
  },
  question: {
    event: r.one.event({ from: r.question.eventId, to: r.event.id, where: notDeleted }),
    answers: r.many.answer({ from: r.question.id, to: r.answer.questionId, where: notDeleted }),
  },
  signup: {
    quota: r.one.quota({ from: r.signup.quotaId, to: r.quota.id, where: notDeleted }),
    answers: r.many.answer({ from: r.signup.id, to: r.answer.signupId, where: notDeleted }),
    payments: r.many.payment({ from: r.signup.id, to: r.payment.signupId }),
    activePayment: r.one.payment({
      from: r.signup.id,
      to: r.payment.signupId,
      where: { status: { in: ACTIVE_PAYMENT_STATUSES } },
      alias: "activePayment",
    }),
  },
  answer: {
    signup: r.one.signup({ from: r.answer.signupId, to: r.signup.id }),
    question: r.one.question({ from: r.answer.questionId, to: r.question.id, where: notDeleted }),
  },
  payment: {
    signup: r.one.signup({ from: r.payment.signupId, to: r.signup.id }),
  },
}));
