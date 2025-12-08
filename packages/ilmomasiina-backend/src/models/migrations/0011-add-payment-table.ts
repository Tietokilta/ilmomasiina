import { DataTypes } from "sequelize";

import { PaymentStatus } from "@tietokilta/ilmomasiina-models";
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
        editToken: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "paid",
            "unpaid",
            "canceled",
            "disabled",
            "pending",
          ),
          allowNull: true,
        }
      },
      {transaction})
    await query.addColumn("signups", "paymentStatus", {
      type: DataTypes.ENUM(
        PaymentStatus.PAID,
        PaymentStatus.UNPAID,
        PaymentStatus.CANCELED,
        PaymentStatus.DISABLED,
        PaymentStatus.PENDING,
      ),
      allowNull: true,
      defaultValue: PaymentStatus.UNPAID,
    }, {transaction})
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.dropTable("payments", {transaction});
    await query.removeColumn("signups", "paymentStatus", {transaction})
  }
});
