import { DataTypes, Model, Optional, Sequelize } from "sequelize";

import { generateRandomId, RANDOM_ID_LENGTH } from "./randomId";

export interface ImageAttributes {
  id: string;
  mimeType: string;
  data: Buffer;
}

export interface ImageCreationAttributes extends Optional<ImageAttributes, "id"> {}

/** An uploaded image, stored in the database so that no separate file storage is needed. */
export class Image extends Model<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
  public id!: string;
  public mimeType!: string;
  public data!: Buffer;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function setupImageModel(sequelize: Sequelize) {
  Image.init(
    {
      id: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        primaryKey: true,
        defaultValue: generateRandomId,
      },
      mimeType: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      data: {
        type: DataTypes.BLOB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "image",
      freezeTableName: true,
    },
  );

  return Image;
}
