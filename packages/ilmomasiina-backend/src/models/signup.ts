import moment from "moment";
import {
  DataTypes,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  HasOneCreateAssociationMixin,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  Model,
  Op,
  Optional,
  Sequelize,
} from "sequelize";

import {
  ManualPaymentStatus,
  PaymentStatus,
  ProductSchema,
  SignupPaymentStatus,
  SignupStatus,
} from "@tietokilta/ilmomasiina-models";
import config from "../config";
import type { Answer } from "./answer";
import type { Payment } from "./payment";
import type { Quota } from "./quota";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";
import { jsonColumnGetter } from "./util/json";

export interface SignupAttributes {
  id: string;
  firstName: string | null;
  lastName: string | null;
  namePublic: boolean;
  email: string | null;
  language: string | null;
  confirmedAt: Date | null;
  status: SignupStatus | null;
  position: number | null;
  /** Total price of the signup in cents, calculated when it was last updated. */
  price: number | null;
  /** The currency in which the price is denominated. */
  currency: string | null;
  /** The product lines used to calculate the price. */
  products: ProductSchema[] | null;
  /** Payment status set manually by an admin, without creating a Payment record. */
  manualPaymentStatus: ManualPaymentStatus | null;
  createdAt: Date;
  deletedAt: Date | null;
  quotaId: Quota["id"];
}

export interface SignupCreationAttributes extends Optional<
  SignupAttributes,
  | "id"
  | "firstName"
  | "lastName"
  | "namePublic"
  | "email"
  | "confirmedAt"
  | "language"
  | "status"
  | "position"
  | "price"
  | "currency"
  | "products"
  | "manualPaymentStatus"
  | "createdAt"
  | "deletedAt"
> {}

export class Signup extends Model<SignupAttributes, SignupCreationAttributes> implements SignupAttributes {
  public id!: string;
  public firstName!: string | null;
  public lastName!: string | null;
  public namePublic!: boolean;
  public email!: string | null;
  public language!: string | null;
  public confirmedAt!: Date | null;
  public status!: SignupStatus | null;
  public position!: number | null;
  public price!: number | null;
  public currency!: string | null;
  public products!: ProductSchema[] | null;
  public manualPaymentStatus!: ManualPaymentStatus | null;
  public deletedAt!: Date | null;

  public quotaId!: Quota["id"];
  public quota?: Quota;
  public getQuota!: HasOneGetAssociationMixin<Quota>;
  public setQuota!: HasOneSetAssociationMixin<Quota, Quota["id"]>;
  public createQuota!: HasOneCreateAssociationMixin<Quota>;

  public answers?: Answer[];
  public getAnswers!: HasManyGetAssociationsMixin<Answer>;
  public countAnswers!: HasManyCountAssociationsMixin;
  public hasAnswer!: HasManyHasAssociationMixin<Answer, Answer["id"]>;
  public hasAnswers!: HasManyHasAssociationsMixin<Answer, Answer["id"]>;
  public setAnswers!: HasManySetAssociationsMixin<Answer, Answer["id"]>;
  public addAnswer!: HasManyAddAssociationMixin<Answer, Answer["id"]>;
  public addAnswers!: HasManyAddAssociationsMixin<Answer, Answer["id"]>;
  public removeAnswer!: HasManyRemoveAssociationMixin<Answer, Answer["id"]>;
  public removeAnswers!: HasManyRemoveAssociationsMixin<Answer, Answer["id"]>;
  public createAnswer!: HasManyCreateAssociationMixin<Answer>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public payments?: Payment[];
  public getPayments!: HasManyGetAssociationsMixin<Payment>;
  public countPayments!: HasManyCountAssociationsMixin;
  public hasPayment!: HasManyHasAssociationMixin<Payment, Payment["id"]>;
  public hasPayments!: HasManyHasAssociationsMixin<Payment, Payment["id"]>;
  public setPayments!: HasManySetAssociationsMixin<Payment, Payment["id"]>;
  public addPayment!: HasManyAddAssociationMixin<Payment, Payment["id"]>;
  public addPayments!: HasManyAddAssociationsMixin<Payment, Payment["id"]>;
  public removePayment!: HasManyRemoveAssociationMixin<Payment, Payment["id"]>;
  public removePayments!: HasManyRemoveAssociationsMixin<Payment, Payment["id"]>;
  public createPayment!: HasManyCreateAssociationMixin<Payment>;

  public activePayment?: Payment | null;
  public getActivePayment!: HasOneGetAssociationMixin<Payment>;
  public setActivePayment!: HasOneSetAssociationMixin<Payment, Payment["id"]>;
  public createActivePayment!: HasOneCreateAssociationMixin<Payment>;

  public static readonly MAX_NAME_LENGTH = 255;
  public static readonly MAX_EMAIL_LENGTH = 255; // TODO

  /** Gets whether this signup has been confirmed (i.e. filled in after creation). */
  public get confirmed(): boolean {
    return this.confirmedAt != null;
  }

  /** Gets the time this signup must be confirmed by before it expires. */
  public get confirmableUntil(): Date {
    return new Date(this.createdAt.getTime() + config.signupConfirmMins * 60 * 1000);
  }

  /** Gets the time this signup is editable until, regardless of signups closing. */
  public get editableAtLeastUntil(): Date {
    return config.signupConfirmAfterClose
      ? new Date(this.createdAt.getTime() + config.signupConfirmMins * 60 * 1000)
      : this.createdAt;
  }

  public get hasPrice(): boolean {
    return this.price != null && this.price > 0;
  }

  public get effectivePaymentStatus(): SignupPaymentStatus | null {
    if (!this.payments) throw new Error("Payments not loaded for signup");
    // Find payments by status
    const paidPayment = this.payments.some((p) => p.status === PaymentStatus.PAID);
    const refundedPayment = this.payments.some((p) => p.status === PaymentStatus.REFUNDED);

    // If paid online or manually, it's paid
    if (paidPayment || this.manualPaymentStatus === ManualPaymentStatus.PAID) return SignupPaymentStatus.PAID;
    // If refunded online or manually, it's refunded
    if (refundedPayment || this.manualPaymentStatus === ManualPaymentStatus.REFUNDED)
      return SignupPaymentStatus.REFUNDED;
    // If no need to pay, don't check further
    if (!this.hasPrice) return null;
    // If the signup has a price but no payment, it's pending (regardless of if payments exist)
    return SignupPaymentStatus.PENDING;
  }
}

export default function setupSignupModel(sequelize: Sequelize) {
  Signup.init(
    {
      id: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        primaryKey: true,
        defaultValue: generateRandomId,
      },
      quotaId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true,
        },
      },
      lastName: {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true,
        },
      },
      namePublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true,
        },
      },
      language: {
        type: DataTypes.STRING(8), // allow for language variants
        validate: {
          notEmpty: true,
        },
      },
      confirmedAt: {
        type: DataTypes.DATE(3),
      },
      status: {
        type: DataTypes.ENUM(...Object.values(SignupStatus)),
      },
      position: {
        type: DataTypes.INTEGER,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: true,
      },
      products: {
        type: DataTypes.JSON,
        allowNull: true,
        get: jsonColumnGetter<ProductSchema[]>("products"),
      },
      manualPaymentStatus: {
        type: DataTypes.ENUM(...Object.values(ManualPaymentStatus)),
        allowNull: true,
      },
      // Add createdAt manually to support milliseconds
      createdAt: {
        type: DataTypes.DATE(3),
        defaultValue: () => new Date(),
        allowNull: false,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "signup",
      freezeTableName: true,
      paranoid: false,
      scopes: {
        active: () => ({
          where: {
            // Not deleted
            deletedAt: { [Op.is]: null },
            [Op.or]: {
              // Is confirmed, or is new enough
              confirmedAt: { [Op.ne]: null },
              createdAt: { [Op.gt]: moment().subtract(config.signupConfirmMins, "minutes").toDate() },
            },
          },
        }),
        admin: () => ({
          where: {
            [Op.or]: [
              // Non-deleted active signups like above
              {
                deletedAt: { [Op.is]: null },
                [Op.or]: {
                  confirmedAt: { [Op.ne]: null },
                  createdAt: { [Op.gt]: moment().subtract(config.signupConfirmMins, "minutes").toDate() },
                },
              },
              // All deleted signups - filter by payment status after query
              { deletedAt: { [Op.ne]: null } },
            ],
          },
        }),
      },
    },
  );

  return Signup;
}
