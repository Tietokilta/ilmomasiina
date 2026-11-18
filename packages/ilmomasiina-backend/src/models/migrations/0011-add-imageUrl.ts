import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0011-add-imageUrl",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.addColumn("event", "imageUrl", { type: DataTypes.STRING(1024), allowNull: true }, { transaction });
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("event", "imageUrl", { transaction });
  },
});
