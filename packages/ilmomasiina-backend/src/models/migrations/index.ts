import { Sequelize } from 'sequelize';
import { RunnableMigration } from 'umzug';

import _0000_initial from './0000-initial';
import _0001_add_audit_logs from './0001-add-audit-logs';
import _0002_add_event_endDate from './0002-add-event-endDate';
import _0003_add_signup_language from './0003-add-signup-language';
import _0004_answers_to_json from './0004-answers-to-json';
import _0005_add_indexes from './0005-add-indexes';

const migrations: RunnableMigration<Sequelize>[] = [
  _0000_initial,
  _0001_add_audit_logs,
  _0002_add_event_endDate,
  _0003_add_signup_language,
  _0004_answers_to_json,
  _0005_add_indexes,
];

export default migrations;
