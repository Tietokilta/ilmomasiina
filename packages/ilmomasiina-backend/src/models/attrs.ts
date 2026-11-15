// Column selections for relational queries, i.e. the fields each API response includes.

/** Columns included in GET /api/events/slug for events. */
export const eventGetEventColumns = {
  id: true,
  title: true,
  slug: true,
  date: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  openQuotaSize: true,
  description: true,
  price: true,
  location: true,
  webpageUrl: true,
  facebookUrl: true,
  category: true,
  signupsPublic: true,
  nameQuestion: true,
  emailQuestion: true,
  payments: true,
  languages: true,
  defaultLanguage: true,
} as const;

/** Columns included in GET /api/admin/events/ID for events. */
export const adminEventGetEventColumns = {
  ...eventGetEventColumns,
  draft: true,
  listed: true,
  preferredFrontend: true,
  verificationEmail: true,
  updatedAt: true,
} as const;

/** Columns included in results for questions. */
export const eventGetQuestionColumns = {
  id: true,
  question: true,
  type: true,
  options: true,
  required: true,
  public: true,
  prices: true,
} as const;

/** Columns included in results for quotas. */
export const eventGetQuotaColumns = { id: true, title: true, size: true, price: true } as const;

/** Columns included in GET /api/events/slug for signups. */
export const eventGetSignupColumns = {
  firstName: true,
  lastName: true,
  namePublic: true,
  status: true,
  position: true,
  createdAt: true,
  confirmedAt: true,
} as const;

/** Columns included in GET /api/admin/events/ID for signups. */
export const adminEventGetSignupColumns = {
  ...eventGetSignupColumns,
  id: true,
  email: true,
  price: true,
  currency: true,
  manualPaymentStatus: true,
  deletedAt: true,
} as const;

/** Columns included in results for answers. */
export const eventGetAnswerColumns = { questionId: true, answer: true } as const;

/** Columns included in GET /api/events for events. */
export const eventListEventColumns = {
  id: true,
  slug: true,
  title: true,
  date: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  openQuotaSize: true,
  description: true,
  price: true,
  location: true,
  webpageUrl: true,
  facebookUrl: true,
  category: true,
  signupsPublic: true,
  nameQuestion: true,
  emailQuestion: true,
  payments: true,
  languages: true,
  defaultLanguage: true,
} as const;

/** Columns included in GET /api/events for quotas. */
export const eventListQuotaColumns = { id: true, title: true, size: true, price: true } as const;

/** Columns included in GET /api/admin/events for events. */
export const adminEventListEventColumns = { ...eventListEventColumns, draft: true, listed: true } as const;
