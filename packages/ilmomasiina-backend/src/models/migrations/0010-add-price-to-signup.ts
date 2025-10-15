import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0010-add-price-to-signup",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
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
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("signup", "price", { transaction });
  },
});
