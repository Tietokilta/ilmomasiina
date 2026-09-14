import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0011-add-branding",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.createTable(
      "branding",
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        headerTitle: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        headerTitleShort: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        brandColor: {
          type: DataTypes.STRING(7),
          allowNull: true,
        },
        dangerColor: {
          type: DataTypes.STRING(7),
          allowNull: true,
        },
        logo: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        favicon: {
          type: DataTypes.TEXT,
          allowNull: true,
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
    await query.dropTable("branding", { transaction });
  },
});
