import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0009-add-price-to-question-options",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.addColumn(
      "question",
      "prices",
      {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      { transaction },
    );
    await query.addColumn(
      "answer",
      "price",
      {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: 0,
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("question", "prices", { transaction });
    await query.removeColumn("answer", "price", { transaction });
  },
});
