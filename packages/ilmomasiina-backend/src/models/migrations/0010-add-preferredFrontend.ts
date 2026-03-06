import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0010-add-preferredFrontend",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.addColumn(
      "event",
      "preferredFrontend",
      {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "default",
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("event", "preferredFrontend", { transaction });
  },
});
