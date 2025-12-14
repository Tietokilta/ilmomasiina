import moment from "moment/moment";
import { DataTypes, Model, Op, Optional, Sequelize } from "sequelize";

import { PaymentStatus } from "@tietokilta/ilmomasiina-models/dist/enum";
import { PaymentAttributes } from "@tietokilta/ilmomasiina-models/dist/models";
import config from "../config";

interface PaymentManualAttributes extends Omit<PaymentAttributes, "updatedAt"> {}

export interface PaymentCreateAttributes
  extends Optional<
    PaymentManualAttributes,
    "stripeId" | "signupId" | "editToken" | "amount" | "status" | "createdAt" | "expiresAt"
  > {}

export class Payment extends Model<PaymentManualAttributes, PaymentCreateAttributes> implements PaymentAttributes {
  public stripeId!: string;
  public signupId!: string;
  public editToken!: string;
  public amount!: number;
  public status!: PaymentStatus | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly expiresAt!: Date;
  public readonly completedAt!: Date | null;
}

export default function setupPaymentModel(sequelize: Sequelize) {
  Payment.init(
    {
      stripeId: {
        type: DataTypes.STRING,
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
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM(...Object.values(PaymentStatus)),
        allowNull: false,
        defaultValue: PaymentStatus.PENDING,
      },
      createdAt: {
        type: DataTypes.DATE(3),
        defaultValue: () => new Date(),
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE(3),
        allowNull: false,
      },
      completedAt: {
        type: DataTypes.DATE(3),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "payment",
      freezeTableName: true,
      paranoid: false,
      scopes: {
        active: () => ({
          where: {
            createdAt: {
              [Op.gt]: moment().subtract(config.signupConfirmMins, "minutes").toDate(),
            },
          },
        }),
      },
    },
  );
}
