import { DataTypes, Model, Sequelize } from "sequelize";

export interface SettingAttributes {
  key: string;
  value: object;
}

export class Setting extends Model<SettingAttributes> implements SettingAttributes {
  public key!: string;
  public value!: object;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Key-value store for admin-editable settings, validated by the API schemas in ilmomasiina-models.

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
    },
  );

  return Setting;
}
