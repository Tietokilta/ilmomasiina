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
  Model,
  Op,
  Optional,
  Sequelize,
} from "sequelize";

import type { QuestionCreate, QuotaCreate } from "@tietokilta/ilmomasiina-models";
import type { EventAttributes, EventLanguage } from "@tietokilta/ilmomasiina-models/dist/models";
import config from "../config";
import { EventValidationError } from "./errors";
import type { Question, QuestionCreationAttributes } from "./question";
import type { Quota, QuotaCreationAttributes } from "./quota";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";
import { jsonColumnGetter } from "./util/json";

// Drop updatedAt so we don't need to define it manually in Event.init()
interface EventManualAttributes extends Omit<EventAttributes, "updatedAt"> {}

export interface EventCreationAttributes
  extends Optional<
    EventManualAttributes,
    | "id"
    | "openQuotaSize"
    | "description"
    | "price"
    | "location"
    | "facebookUrl"
    | "webpageUrl"
    | "category"
    | "draft"
    | "listed"
    | "signupsPublic"
    | "nameQuestion"
    | "emailQuestion"
    | "verificationEmail"
    | "languages"
    | "defaultLanguage"
  > {}

export interface EventCreationWithInclude extends EventCreationAttributes {
  questions: Omit<QuestionCreationAttributes, "eventId">[];
  quotas: Omit<QuotaCreationAttributes, "eventId">[];
}

export class Event extends Model<EventManualAttributes, EventCreationAttributes> implements EventAttributes {
  public id!: string;
  public title!: string;
  public slug!: string;
  public date!: Date | null;
  public endDate!: Date | null;
  public registrationStartDate!: Date | null;
  public registrationEndDate!: Date | null;
  public openQuotaSize!: number;
  public description!: string | null;
  public price!: string | null;
  public location!: string | null;
  public facebookUrl!: string | null;
  public webpageUrl!: string | null;
  public category!: string;
  public draft!: boolean;
  public listed!: boolean;
  public signupsPublic!: boolean;
  public nameQuestion!: boolean;
  public emailQuestion!: boolean;
  public verificationEmail!: string | null;
  public languages!: Record<string, EventLanguage>;
  public defaultLanguage!: string;

  public questions?: Question[];
  public getQuestions!: HasManyGetAssociationsMixin<Question>;
  public countQuestions!: HasManyCountAssociationsMixin;
  public hasQuestion!: HasManyHasAssociationMixin<Question, Question["id"]>;
  public hasQuestions!: HasManyHasAssociationsMixin<Question, Question["id"]>;
  public setQuestions!: HasManySetAssociationsMixin<Question, Question["id"]>;
  public addQuestion!: HasManyAddAssociationMixin<Question, Question["id"]>;
  public addQuestions!: HasManyAddAssociationsMixin<Question, Question["id"]>;
  public removeQuestion!: HasManyRemoveAssociationMixin<Question, Question["id"]>;
  public removeQuestions!: HasManyRemoveAssociationsMixin<Question, Question["id"]>;
  public createQuestion!: HasManyCreateAssociationMixin<Question>;

  public quotas?: Quota[];
  public getQuotas!: HasManyGetAssociationsMixin<Quota>;
  public countQuotas!: HasManyCountAssociationsMixin;
  public hasQuota!: HasManyHasAssociationMixin<Quota, Quota["id"]>;
  public hasQuotas!: HasManyHasAssociationsMixin<Quota, Quota["id"]>;
  public setQuotas!: HasManySetAssociationsMixin<Quota, Quota["id"]>;
  public addQuota!: HasManyAddAssociationMixin<Quota, Quota["id"]>;
  public addQuotas!: HasManyAddAssociationsMixin<Quota, Quota["id"]>;
  public removeQuota!: HasManyRemoveAssociationMixin<Quota, Quota["id"]>;
  public removeQuotas!: HasManyRemoveAssociationsMixin<Quota, Quota["id"]>;
  public createQuota!: HasManyCreateAssociationMixin<Quota>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /** Determines the effective end date of the event, matching the scope logic. */
  public get effectiveEndDate() {
    const endDates = [this.endDate, this.date, this.registrationEndDate]
      .filter((date): date is Date => date != null)
      .map((date) => date.getTime());
    if (!endDates.length) return null;
    return endDates.reduce((lhs, rhs) => Math.max(lhs, rhs));
  }

  /** Validates that the languages for the event contain match the given questions and quotas.
   *
   * Removes answer options from questions that do not have them defined in the default language.
   * This expects that options have already been removed from questions that don't support options.
   */
  public validateLanguages(questions: QuestionCreate[], quotas: QuotaCreate[]) {
    for (const [langKey, language] of Object.entries(this.languages)) {
      // All array types have to be kept in sync or the editor experience will be very wonky.
      // We cannot check by ID, because new questions/quotas do not have IDs at this point.

      // Check that quota counts match.
      if (language.quotas.length !== quotas.length)
        throw new EventValidationError(`language ${langKey} has wrong number of quotas`);

      // Check that question counts match.
      if (language.questions.length !== questions.length)
        throw new EventValidationError(`language ${langKey} has wrong number of questions`);

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const localizedQuestion = language.questions[i];
        // Check that option counts match if present on both.
        // Options being unnecessarily set for a language has no effect.
        // Options being unset on a language just falls back to the default language.
        if (
          question.options &&
          localizedQuestion.options &&
          question.options.length !== localizedQuestion.options.length
        ) {
          throw new EventValidationError(`question ${i} in language ${langKey} has wrong number of options`);
        }
        // Remove options if the question does not have them.
        // We expect createEvent/updateEvent to remove options from questions that don't support
        // options before calling this.
        if (!question.options) {
          localizedQuestion.options = null;
        }
      }
    }
  }
}

export default function setupEventModel(sequelize: Sequelize) {
  Event.init(
    {
      id: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        primaryKey: true,
        defaultValue: generateRandomId,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^[A-Za-z0-9_-]+$/,
        },
      },
      date: {
        type: DataTypes.DATE,
      },
      endDate: {
        type: DataTypes.DATE,
      },
      registrationStartDate: {
        type: DataTypes.DATE,
      },
      registrationEndDate: {
        type: DataTypes.DATE,
      },
      openQuotaSize: {
        type: DataTypes.INTEGER,
        validate: {
          min: 0,
        },
        defaultValue: 0,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.STRING,
      },
      location: {
        type: DataTypes.STRING,
      },
      facebookUrl: {
        type: DataTypes.STRING,
      },
      webpageUrl: {
        type: DataTypes.STRING,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
      },
      draft: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      listed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      signupsPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      nameQuestion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emailQuestion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      verificationEmail: {
        type: DataTypes.TEXT,
      },
      languages: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        get: jsonColumnGetter<Record<string, EventLanguage>>("languages"),
      },
      defaultLanguage: {
        type: DataTypes.STRING(8),
        allowNull: false,
        // The default value used for this depends on config, so we can't set it in the database easily.
        get(): string {
          return this.getDataValue("defaultLanguage") ?? config.defaultLanguage;
        },
      },
    },
    {
      sequelize,
      modelName: "event",
      freezeTableName: true,
      paranoid: true,
      validate: {
        noReversedDates(this: Event) {
          if (this.date != null && this.endDate != null && this.date > this.endDate) {
            throw new EventValidationError("endDate must be after or equal to date");
          }
        },
        noReversedRegistrationDates(this: Event) {
          if (
            this.registrationStartDate != null &&
            this.registrationEndDate != null &&
            this.registrationStartDate > this.registrationEndDate
          ) {
            throw new EventValidationError("registrationEndDate must be after or equal to registrationStartDate");
          }
        },
        hasDateOrRegistration(this: Event) {
          if (this.date === null && this.registrationStartDate === null) {
            throw new EventValidationError("either date or registrationStartDate/registrationEndDate must be set");
          }
          if (this.date === null && this.endDate !== null) {
            throw new EventValidationError("endDate may only be set with date");
          }
          if ((this.registrationStartDate === null) !== (this.registrationEndDate === null)) {
            throw new EventValidationError(
              "only neither or both of registrationStartDate and registrationEndDate may be set",
            );
          }
        },
        noDuplicateDefaultLanguage(this: Event) {
          if (this.languages != null && this.languages[this.defaultLanguage]) {
            throw new EventValidationError("defaultLanguage may not be present in languages");
          }
        },
      },
      scopes: {
        // users can see events that:
        user: () => ({
          where: [
            // are not drafts,
            { draft: false },
            {
              // and either:
              [Op.or]: {
                // closed recently enough
                registrationEndDate: {
                  [Op.gt]: moment().subtract(config.hideEventAfterDays, "days").toDate(),
                },
                // or happened recently enough
                date: {
                  [Op.gt]: moment().subtract(config.hideEventAfterDays, "days").toDate(),
                },
                endDate: {
                  [Op.gt]: moment().subtract(config.hideEventAfterDays, "days").toDate(),
                },
              },
            },
          ],
        }),
      },
      hooks: {
        // Events use paranoid mode, so we need to change the slug when deleting
        // to avoid the slug being reserved after deletion.
        async beforeDestroy(instance, options) {
          await instance.update(
            {
              slug: `${instance.slug.substring(0, 100)}-deleted-${Date.now()}`,
            },
            { transaction: options.transaction },
          );
        },
      },
    },
  );

  return Event;
}
