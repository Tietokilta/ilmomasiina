import { DataTypes, Model, Sequelize } from "sequelize";

export interface SettingAttributes {
  key: string;
  value: object;
}

export class Setting extends Model<SettingAttributes> implements SettingAttributes {
  declare key: string;
  declare value: object;
}

export default function setupSettingModel(sequelize: Sequelize) {
  Setting.init(
    {
      key: {
        type: DataTypes.STRING(64),
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "setting",
      freezeTableName: true,
      timestamps: false,
    },
  );

  return Setting;
}
