import { DataTypes } from "sequelize";

import { defineMigration } from "./util";

export default defineMigration({
  name: "0011-add-payment-table",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.createTable("payments",
      {
        stripeId: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        signupId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        paidAt: {
          type: DataTypes.DATE(3),
          allowNull: false,
        },

      },
      {transaction})
  }});
