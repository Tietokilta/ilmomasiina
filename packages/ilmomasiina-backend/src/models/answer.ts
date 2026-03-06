import {
  DataTypes,
  HasOneCreateAssociationMixin,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  Model,
  Optional,
  Sequelize,
} from "sequelize";

import type { Question } from "./question";
import { RANDOM_ID_LENGTH } from "./randomId";
import { Signup } from "./signup";
import { jsonColumnGetter } from "./util/json";

export interface AnswerAttributes {
  id: string;
  answer: string | string[];
  questionId: Question["id"];
  signupId: Signup["id"];
}

export interface AnswerCreationAttributes extends Optional<AnswerAttributes, "id"> {}

export class Answer extends Model<AnswerAttributes, AnswerCreationAttributes> implements AnswerAttributes {
  public id!: string;
  public answer!: string | string[];

  public questionId!: Question["id"];
  public question?: Question;
  public getQuestion!: HasOneGetAssociationMixin<Question>;
  public setQuestion!: HasOneSetAssociationMixin<Question, Question["id"]>;
  public createQuestion!: HasOneCreateAssociationMixin<Question>;

  public signupId!: Signup["id"];
  public signup?: Signup;
  public getSignup!: HasOneGetAssociationMixin<Signup>;
  public setSignup!: HasOneSetAssociationMixin<Signup, Signup["id"]>;
  public createSignup!: HasOneCreateAssociationMixin<Signup>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function setupAnswerModel(sequelize: Sequelize) {
  Answer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      questionId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: false,
      },
      signupId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: false,
      },
      answer: {
        type: DataTypes.JSON,
        allowNull: false,
        get: jsonColumnGetter<string | string[]>("answer"),
      },
    },
    {
      sequelize,
      modelName: "answer",
      freezeTableName: true,
      paranoid: true,
    },
  );

  return Answer;
}
