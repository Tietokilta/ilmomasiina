import { DataTypes } from "sequelize";

import { PaymentStatus } from "@tietokilta/ilmomasiina-models";
import { defineMigration } from "./util";

export default defineMigration({
  name: "0009-add-payment-table",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.createTable(
      "payment",
      {
        stripeId: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        signupId: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: "signup",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        editToken: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: DataTypes.INTEGER,
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
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PaymentStatus)),
          allowNull: false,
        },
      },
      { transaction },
    );
    await query.addColumn(
      "signup",
      "paymentStatus",
      {
        type: DataTypes.ENUM(...Object.values(PaymentStatus)),
        allowNull: false,
        defaultValue: PaymentStatus.UNPAID,
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.dropTable("payment", { transaction });
    await query.removeColumn("signup", "paymentStatus", { transaction });
  },
});
