import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

// Constant from ../randomId
const RANDOM_ID_LENGTH = 12;

export default defineMigration({
  name: "0012-add-images",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.createTable(
      "image",
      {
        id: {
          type: DataTypes.CHAR(RANDOM_ID_LENGTH),
          primaryKey: true,
        },
        mimeType: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        data: {
          type: DataTypes.BLOB,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.dropTable("image", { transaction });
  },
});
