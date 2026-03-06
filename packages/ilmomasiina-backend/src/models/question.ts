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

import { QuestionCreate, QuestionType } from "@tietokilta/ilmomasiina-models";
import type { Answer } from "./answer";
import { EventValidationError } from "./errors";
import type { Event } from "./event";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";
import { jsonColumnGetter } from "./util/json";

export interface QuestionAttributes {
  id: string;
  order: number;
  question: string;
  type: QuestionType;
  options: string[] | null;
  prices: number[] | null;
  required: boolean;
  public: boolean;
  eventId: Event["id"];
}

export interface QuestionCreationAttributes extends Optional<
  QuestionAttributes,
  "id" | "options" | "prices" | "required" | "public"
> {}

export class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: string;
  public order!: number;
  public question!: string;
  public type!: QuestionType;
  public options!: string[] | null;
  public prices!: number[] | null;
  public required!: boolean;
  public public!: boolean;

  public eventId!: Event["id"];
  public event?: Event;
  public getEvent!: HasOneGetAssociationMixin<Event>;
  public setEvent!: HasOneSetAssociationMixin<Event, Event["id"]>;
  public createEvent!: HasOneCreateAssociationMixin<Event>;

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

  /**
   * Returns override values to normalize `options` and/or `prices` to null in cases such as:
   *
   * - options are not supported for the question type
   * - options are null or empty
   * - prices are all zero
   *
   * This needs to run before Event.validateLanguages(), which checks `Question.options == null`
   * to scrub unneeded localized options.
   *
   * In turn, this means that this must run before the Event and Question instances can be created,
   * and so this applies to the raw attributes.
   */
  static normalizeOptions(attrs: Partial<QuestionCreate>) {
    const output: Partial<QuestionCreate> = {};
    // Unset prices and options for non-option question types, or if options are null or empty
    if (
      (attrs.type !== QuestionType.CHECKBOX && attrs.type !== QuestionType.SELECT) ||
      !attrs.options ||
      attrs.options.length === 0
    ) {
      output.options = null;
      output.prices = null;
    }
    // Unset prices if all prices are zero
    if (attrs.prices?.every((price) => price === 0)) {
      output.prices = null;
    }
    // Zero-length prices is an incorrect input and will be caught by validation, ignore it here
    return output;
  }
}

export default function setupQuestionModel(sequelize: Sequelize) {
  Question.init(
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
      question: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      type: {
        type: DataTypes.ENUM(...Object.values(QuestionType)),
        allowNull: false,
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true,
        get: jsonColumnGetter<string[]>("options"),
        validate: {
          validOptionsArray(value: string[] | null) {
            if (value == null) return;
            if (!Array.isArray(value)) {
              throw new EventValidationError("Options must be an array or null");
            }
            // TODO: Prevent empty and non-unique options in a future version
            if (value.some((option) => typeof option !== "string")) {
              throw new EventValidationError("Each option must be a string");
            }
          },
        },
      },
      prices: {
        type: DataTypes.JSON,
        allowNull: true,
        get: jsonColumnGetter<number[]>("prices"),
        validate: {
          validPricesArray(value: number[] | null) {
            if (value == null) return;
            if (!Array.isArray(value)) {
              throw new EventValidationError("Prices must be an array or null");
            }
            if (value.some((price) => typeof price !== "number" || !Number.isSafeInteger(price) || price < 0)) {
              throw new EventValidationError("Each option price must be a non-negative integer");
            }
          },
        },
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      public: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "question",
      freezeTableName: true,
      paranoid: true,
      validate: {
        pricesMatchOptions(this: Question) {
          if (this.prices && this.options && this.prices.length !== this.options.length) {
            throw new EventValidationError("Prices length must match options length");
          }
        },
      },
    },
  );

  return Question;
}
