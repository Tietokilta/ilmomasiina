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
  Optional,
  Sequelize,
} from "sequelize";

import type { Event } from "./event";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";
import type { Signup } from "./signup";

export interface QuotaAttributes {
  id: string;
  order: number;
  title: string;
  size: number | null;
  eventId: Event["id"];
  signupCount?: number | string;
  price: number;
}

export interface QuotaCreationAttributes extends Optional<QuotaAttributes, "id"> {}

export class Quota extends Model<QuotaAttributes, QuotaCreationAttributes> implements QuotaAttributes {
  declare id: string;
  declare order: number;
  declare title: string;
  declare size: number | null;
  declare price: number;

  declare eventId: Event["id"];
  declare event?: Event;
  declare getEvent: HasOneGetAssociationMixin<Event | null>;
  declare setEvent: HasOneSetAssociationMixin<Event, Event["id"]>;
  declare createEvent: HasOneCreateAssociationMixin<Event>;

  declare signups?: Signup[];
  declare getSignups: HasManyGetAssociationsMixin<Signup>;
  declare countSignups: HasManyCountAssociationsMixin;
  declare hasSignup: HasManyHasAssociationMixin<Signup, Signup["id"]>;
  declare hasSignups: HasManyHasAssociationsMixin<Signup, Signup["id"]>;
  declare setSignups: HasManySetAssociationsMixin<Signup, Signup["id"]>;
  declare addSignup: HasManyAddAssociationMixin<Signup, Signup["id"]>;
  declare addSignups: HasManyAddAssociationsMixin<Signup, Signup["id"]>;
  declare removeSignup: HasManyRemoveAssociationMixin<Signup, Signup["id"]>;
  declare removeSignups: HasManyRemoveAssociationsMixin<Signup, Signup["id"]>;
  declare createSignup: HasManyCreateAssociationMixin<Signup>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Virtual columns for some queries (TODO: is there a cleaner way?)
  // Postgres returns bigint from COUNT, which Sequelize returns as string...
  declare readonly signupCount?: number | string;
}

export default function setupQuotaModel(sequelize: Sequelize) {
  Quota.init(
    {
      id: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        primaryKey: true,
        defaultValue: generateRandomId,
      },
      eventId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: false,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      size: {
        type: DataTypes.INTEGER,
        validate: {
          min: 1,
        },
      },
      signupCount: {
        type: DataTypes.VIRTUAL,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "quota",
      // Apparently 'quota' is plural of 'quotum', and sequelize + node-inflection
      // would _really_ like to call our foreign key 'quotumId'.
      name: {
        singular: "quota",
        plural: "quotas",
      },
      freezeTableName: true,
      paranoid: true,
    },
  );

  return Quota;
}
