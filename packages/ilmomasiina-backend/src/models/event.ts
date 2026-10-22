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

import { PaymentMode, QuestionCreate, QuotaCreate } from "@tietokilta/ilmomasiina-models";
import type { QuestionLanguage, QuotaLanguage } from "@tietokilta/ilmomasiina-models/dist/schema";
import config from "../config";
import { EventValidationError } from "./errors";
import type { Question, QuestionCreationAttributes } from "./question";
import type { Quota, QuotaCreationAttributes } from "./quota";
import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";
import { jsonColumnGetter } from "./util/json";

interface EventPerLanguageAttributes {
  title: string;
  description: string | null;
  price: string | null;
  location: string | null;
  webpageUrl: string | null;
  facebookUrl: string | null;
  verificationEmail: string | null;
}

export interface EventLanguage extends EventPerLanguageAttributes {
  quotas: QuotaLanguage[];
  questions: QuestionLanguage[];
}

export interface EventAttributes extends EventPerLanguageAttributes {
  id: string;
  slug: string;
  date: Date | null;
  endDate: Date | null;
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
  openQuotaSize: number;
  category: string;
  draft: boolean;
  listed: boolean;
  signupsPublic: boolean;
  nameQuestion: boolean;
  emailQuestion: boolean;
  payments: PaymentMode;
  preferredFrontend: string;
  languages: Record<string, EventLanguage>;
  defaultLanguage: string;
  updatedAt: Date;
}

// Drop updatedAt so we don't need to define it manually in Event.init().
// updatedAt is in EventAttributes since it's referenced in the adminEventListEventAttrs array, which is
// type-checked against EventAttributes.
interface EventManualAttributes extends Omit<EventAttributes, "updatedAt"> {}

export interface EventCreationAttributes extends Optional<
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
  | "preferredFrontend"
  | "languages"
  | "defaultLanguage"
> {}

export interface EventCreationWithInclude extends EventCreationAttributes {
  questions: Omit<QuestionCreationAttributes, "eventId">[];
  quotas: Omit<QuotaCreationAttributes, "eventId">[];
}

export class Event extends Model<EventManualAttributes, EventCreationAttributes> implements EventAttributes {
  declare id: string;
  declare title: string;
  declare slug: string;
  declare date: Date | null;
  declare endDate: Date | null;
  declare registrationStartDate: Date | null;
  declare registrationEndDate: Date | null;
  declare openQuotaSize: number;
  declare description: string | null;
  declare price: string | null;
  declare location: string | null;
  declare facebookUrl: string | null;
  declare webpageUrl: string | null;
  declare category: string;
  declare draft: boolean;
  declare listed: boolean;
  declare signupsPublic: boolean;
  declare nameQuestion: boolean;
  declare emailQuestion: boolean;
  declare verificationEmail: string | null;
  declare payments: PaymentMode;
  declare preferredFrontend: string;
  declare languages: Record<string, EventLanguage>;
  declare defaultLanguage: string;

  declare questions?: Question[];
  declare getQuestions: HasManyGetAssociationsMixin<Question>;
  declare countQuestions: HasManyCountAssociationsMixin;
  declare hasQuestion: HasManyHasAssociationMixin<Question, Question["id"]>;
  declare hasQuestions: HasManyHasAssociationsMixin<Question, Question["id"]>;
  declare setQuestions: HasManySetAssociationsMixin<Question, Question["id"]>;
  declare addQuestion: HasManyAddAssociationMixin<Question, Question["id"]>;
  declare addQuestions: HasManyAddAssociationsMixin<Question, Question["id"]>;
  declare removeQuestion: HasManyRemoveAssociationMixin<Question, Question["id"]>;
  declare removeQuestions: HasManyRemoveAssociationsMixin<Question, Question["id"]>;
  declare createQuestion: HasManyCreateAssociationMixin<Question>;

  declare quotas?: Quota[];
  declare getQuotas: HasManyGetAssociationsMixin<Quota>;
  declare countQuotas: HasManyCountAssociationsMixin;
  declare hasQuota: HasManyHasAssociationMixin<Quota, Quota["id"]>;
  declare hasQuotas: HasManyHasAssociationsMixin<Quota, Quota["id"]>;
  declare setQuotas: HasManySetAssociationsMixin<Quota, Quota["id"]>;
  declare addQuota: HasManyAddAssociationMixin<Quota, Quota["id"]>;
  declare addQuotas: HasManyAddAssociationsMixin<Quota, Quota["id"]>;
  declare removeQuota: HasManyRemoveAssociationMixin<Quota, Quota["id"]>;
  declare removeQuotas: HasManyRemoveAssociationsMixin<Quota, Quota["id"]>;
  declare createQuota: HasManyCreateAssociationMixin<Quota>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /** Determines the effective end date of the event, matching the scope logic. */
  public get effectiveEndDate() {
    const endDates = [this.endDate, this.date, this.registrationEndDate]
      .filter((date): date is Date => date != null)
      .map((date) => date.getTime());
    if (!endDates.length) return null;
    return endDates.reduce((lhs, rhs) => Math.max(lhs, rhs));
  }

  public get paymentsEnabled(): boolean {
    return this.payments !== PaymentMode.DISABLED;
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
        // We expect Question.normalizeOptions() to remove unnecessary options before this is called.
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
      payments: {
        type: DataTypes.ENUM(...Object.values(PaymentMode)),
        allowNull: false,
        defaultValue: PaymentMode.DISABLED,
      },
      preferredFrontend: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "default",
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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- sequelize mistyping
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
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- indexing may fail
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
