import { QueryTypes } from "sequelize";

import { defineMigration } from "./util";

type RawQuestion = {
  id: string;
  type: string;
  options: string;
};

type RawAnswer = {
  id: string;
  answer: string;
  type: string;
};

export default defineMigration({
  name: "0004-answers-to-json",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    // Handle different quoting for Postgres & MySQL
    const q = ([name]: TemplateStringsArray) => query.quoteIdentifiers(name);
    // Convert question options to JSON
    const questions = await sequelize.query<RawQuestion>(
      `SELECT ${q`id`}, ${q`type`}, ${q`options`} FROM ${q`question`}`,
      { type: QueryTypes.SELECT, transaction },
    );
    for (const row of questions) {
      let optionsJson = null;
      if (row.type === "checkbox" || row.type === "select") {
        optionsJson = row.options ? JSON.stringify(row.options.split(";")) : JSON.stringify([""]);
      }
      // eslint-disable-next-line no-await-in-loop
      await query.bulkUpdate("question", { options: optionsJson }, { id: row.id }, { transaction });
    }
    // Convert answers to JSON
    const answers = await sequelize.query<RawAnswer>(
      `SELECT ${q`answer.id`}, ${q`answer.answer`}, ${q`question.type`} ` +
        `FROM ${q`answer`} ` +
        `LEFT JOIN ${q`question`} ON ${q`answer.questionId`} = ${q`question.id`}`,
      { type: QueryTypes.SELECT, transaction },
    );
    for (const row of answers) {
      // Non-checkbox question -> "entire answer"
      // Non-empty answer to checkbox question -> ["ans1", "ans2"]
      // Empty answer to checkbox question -> []
      const answer = row.type === "checkbox" ? row.answer.split(";").filter(Boolean) : row.answer;
      const answerJson = JSON.stringify(answer);
      // eslint-disable-next-line no-await-in-loop
      await query.bulkUpdate("answer", { answer: answerJson }, { id: row.id }, { transaction });
    }
  },
});
