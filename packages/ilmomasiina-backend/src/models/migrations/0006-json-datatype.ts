import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0006-json-datatype",
  async up({ context: { sequelize, transaction } }) {
    if (sequelize.getDialect() === "postgres") {
      // Postgres requires USING to convert to JSON, which we can't provide via QueryInterface.
      await sequelize.query(
        `
          ALTER TABLE "answer"
          ALTER COLUMN "answer" TYPE json USING "answer"::json;
        `,
        { transaction },
      );
      await sequelize.query(
        `
          ALTER TABLE "question"
          ALTER COLUMN "options" TYPE json USING "options"::json;
        `,
        { transaction },
      );
    } else {
      const query = sequelize.getQueryInterface();
      await query.changeColumn(
        "answer",
        "answer",
        {
          type: DataTypes.JSON,
          allowNull: false,
        },
        { transaction },
      );
      await query.changeColumn(
        "question",
        "options",
        {
          type: DataTypes.JSON,
          allowNull: true,
        },
        { transaction },
      );
    }
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.changeColumn(
      "answer",
      "answer",
      {
        type: DataTypes.STRING,
        allowNull: false,
      },
      { transaction },
    );
    await query.changeColumn(
      "question",
      "options",
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction },
    );
  },
});
