import { Sequelize } from "sequelize";
import { RunnableMigration } from "umzug";

import _0000_initial from "./0000-initial";
import _0001_add_audit_logs from "./0001-add-audit-logs";
import _0002_add_event_endDate from "./0002-add-event-endDate";
import _0003_add_signup_language from "./0003-add-signup-language";
import _0004_answers_to_json from "./0004-answers-to-json";
import _0005_add_indexes from "./0005-add-indexes";
import _0006_json_datatype from "./0006-json-datatype";
import _0007_add_languages from "./0007-add-languages";
import _0008_add_price_to_quota from "./0008-add-price-to-quota";
import _0009_add_price_to_question_options from "./0009-add-price-to-question-options";
import _0010_add_price_to_signup from "./0010-add-price-to-signup";
import _0011_add_payment_table from "./0011-add-payment-table";

const migrations: RunnableMigration<Sequelize>[] = [
  _0000_initial,
  _0001_add_audit_logs,
  _0002_add_event_endDate,
  _0003_add_signup_language,
  _0004_answers_to_json,
  _0005_add_indexes,
  _0006_json_datatype,
  _0007_add_languages,
  _0008_add_price_to_quota,
  _0009_add_price_to_question_options,
  _0010_add_price_to_signup,
  _0011_add_payment_table,
];

export default migrations;
