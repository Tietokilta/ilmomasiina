import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface UserAttributes {
  id: number;
  email: string;
  password: string;
}

export interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare password: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// User for local auth admin signup

export default function setupUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "user",
      freezeTableName: true,
    },
  );

  return User;
}
