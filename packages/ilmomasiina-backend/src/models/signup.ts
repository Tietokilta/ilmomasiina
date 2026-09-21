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
  declare id: string;
  declare firstName: string | null;
  declare lastName: string | null;
  declare namePublic: boolean;
  declare email: string | null;
  declare language: string | null;
  declare confirmedAt: Date | null;
  declare status: SignupStatus | null;
  declare position: number | null;
  declare price: number | null;
  declare currency: string | null;
  declare products: ProductSchema[] | null;
  declare manualPaymentStatus: ManualPaymentStatus | null;
  declare deletedAt: Date | null;

  declare quotaId: Quota["id"];
  declare quota?: Quota;
  declare getQuota: HasOneGetAssociationMixin<Quota | null>;
  declare setQuota: HasOneSetAssociationMixin<Quota, Quota["id"]>;
  declare createQuota: HasOneCreateAssociationMixin<Quota>;

  declare answers?: Answer[];
  declare getAnswers: HasManyGetAssociationsMixin<Answer>;
  declare countAnswers: HasManyCountAssociationsMixin;
  declare hasAnswer: HasManyHasAssociationMixin<Answer, Answer["id"]>;
  declare hasAnswers: HasManyHasAssociationsMixin<Answer, Answer["id"]>;
  declare setAnswers: HasManySetAssociationsMixin<Answer, Answer["id"]>;
  declare addAnswer: HasManyAddAssociationMixin<Answer, Answer["id"]>;
  declare addAnswers: HasManyAddAssociationsMixin<Answer, Answer["id"]>;
  declare removeAnswer: HasManyRemoveAssociationMixin<Answer, Answer["id"]>;
  declare removeAnswers: HasManyRemoveAssociationsMixin<Answer, Answer["id"]>;
  declare createAnswer: HasManyCreateAssociationMixin<Answer>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare payments?: Payment[];
  declare getPayments: HasManyGetAssociationsMixin<Payment>;
  declare countPayments: HasManyCountAssociationsMixin;
  declare hasPayment: HasManyHasAssociationMixin<Payment, Payment["id"]>;
  declare hasPayments: HasManyHasAssociationsMixin<Payment, Payment["id"]>;
  declare setPayments: HasManySetAssociationsMixin<Payment, Payment["id"]>;
  declare addPayment: HasManyAddAssociationMixin<Payment, Payment["id"]>;
  declare addPayments: HasManyAddAssociationsMixin<Payment, Payment["id"]>;
  declare removePayment: HasManyRemoveAssociationMixin<Payment, Payment["id"]>;
  declare removePayments: HasManyRemoveAssociationsMixin<Payment, Payment["id"]>;
  declare createPayment: HasManyCreateAssociationMixin<Payment>;

  declare activePayment?: Payment | null;
  declare getActivePayment: HasOneGetAssociationMixin<Payment | null>;
  declare setActivePayment: HasOneSetAssociationMixin<Payment, Payment["id"]>;
  declare createActivePayment: HasOneCreateAssociationMixin<Payment>;

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
