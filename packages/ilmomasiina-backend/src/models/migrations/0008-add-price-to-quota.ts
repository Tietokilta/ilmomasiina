import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0008-add-price-to-quota",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
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
      "quota",
      "priceId",
      {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      { transaction },
    )
    await query.addColumn(
      "event",
      "openQuotaPrice",
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      { transaction },
    )
    await query.addColumn(
      "event",
      "openQuotaPriceId",
      {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      { transaction },
    )
    // Sequelize MySQL doesn't initialize default values for JSON columns.
    await query.bulkUpdate("quota", { price: "0" }, {}, { transaction });
    await query.bulkUpdate("quota", { priceId: "" }, {}, { transaction });
    await query.bulkUpdate("event", { openQuotaPrice: "0" }, {}, { transaction });
    await query.bulkUpdate("event", { openQuotaPriceId: "" }, {}, { transaction });
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("quota", "price", { transaction });
    await query.removeColumn("quota", "priceId", { transaction });
    await query.removeColumn("event", "openQuotaPrice", { transaction });
    await query.removeColumn("event", "openQuotaPriceId", { transaction });
  },
});
