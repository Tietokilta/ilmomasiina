import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0008-add-price-to-quota",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();

    // Add price to quotas and questions
    await query.addColumn(
      "quota",
      "price",
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      { transaction },
    );
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

    // Add price to signup and answer (used to store the calculated price at signup time)
    await query.addColumn(
      "signup",
      "price",
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    await query.removeColumn("quota", "price", { transaction });
    await query.removeColumn("question", "prices", { transaction });
    await query.removeColumn("signup", "price", { transaction });
    await query.removeColumn("answer", "price", { transaction });
  },
});
