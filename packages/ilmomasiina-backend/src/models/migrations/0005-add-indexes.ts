import { defineMigration } from './util';

export default defineMigration({
  name: '0005-add-indexes',
  async up({ context: { sequelize } }) {
    await sequelize.query(`CREATE INDEX idx_event_main ON public.event (
      "deletedAt",
      "date",
      "registrationEndDate",
      "title");`);
    await sequelize.query(`CREATE INDEX idx_quota_eventId_deletedAt_order ON public.quota (
      "eventId",
      "deletedAt",
      "order");`);
    await sequelize.query(`CREATE INDEX idx_signup_quotaId_deletedAt_confirmedAt_createdAt ON public.signup (
      "quotaId",
      "deletedAt",
      "confirmedAt",
      "createdAt");`);
    await sequelize.query(`CREATE INDEX idx_answer_signupId_deletedAt_questionId ON public.answer (
      "signupId",
      "deletedAt",
      "questionId");`);
  },
  async down({ context: { sequelize } }) {
    await sequelize.query('DROP INDEX IF EXISTS idx_event_main;');
    await sequelize.query('DROP INDEX IF EXISTS idx_quota_eventId_deletedAt_order;');
    await sequelize.query('DROP INDEX IF EXISTS idx_signup_quotaId_deletedAt_confirmedAt_createdAt;');
    await sequelize.query('DROP INDEX IF EXISTS idx_answer_signupId_deletedAt_questionId;');
  },
});
