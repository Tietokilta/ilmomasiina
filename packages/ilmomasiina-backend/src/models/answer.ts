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
  declare id: string;
  declare answer: string | string[];

  declare questionId: Question["id"];
  declare question?: Question;
  declare getQuestion: HasOneGetAssociationMixin<Question | null>;
  declare setQuestion: HasOneSetAssociationMixin<Question, Question["id"]>;
  declare createQuestion: HasOneCreateAssociationMixin<Question>;

  declare signupId: Signup["id"];
  declare signup?: Signup;
  declare getSignup: HasOneGetAssociationMixin<Signup | null>;
  declare setSignup: HasOneSetAssociationMixin<Signup, Signup["id"]>;
  declare createSignup: HasOneCreateAssociationMixin<Signup>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
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
