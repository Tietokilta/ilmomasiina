import { DataTypes } from "sequelize";

import { PaymentMode } from "@tietokilta/ilmomasiina-models";
import { defineMigration } from "./util";

export default defineMigration({
  name: "0008-add-price-fields",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();

    // Add payment-related columns to event, quotas and questions
    await query.addColumn(
      "event",
      "payments",
      {
        type: DataTypes.ENUM(...Object.values(PaymentMode)),
        allowNull: false,
        defaultValue: PaymentMode.DISABLED,
      },
      { transaction },
    );
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

    // Add calculated price columns to signup
    await query.addColumn(
      "signup",
      "price",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      { transaction },
    );
    await query.addColumn(
      "signup",
      "currency",
      {
        type: DataTypes.STRING(8),
        allowNull: true,
      },
      { transaction },
    );
    await query.addColumn(
      "signup",
      "products",
      {
        type: DataTypes.JSON,
        allowNull: true,
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("event", "payments", { transaction });
    await query.removeColumn("quota", "price", { transaction });
    await query.removeColumn("question", "prices", { transaction });
    await query.removeColumn("signup", "price", { transaction });
    await query.removeColumn("signup", "currency", { transaction });
    await query.removeColumn("signup", "products", { transaction });
  },
});
