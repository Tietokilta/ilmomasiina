import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0014-add-signupLink",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.addColumn("event", "signupLink", { type: DataTypes.STRING(1024), allowNull: true }, { transaction });
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("event", "signupLink", { transaction });
  },
});
