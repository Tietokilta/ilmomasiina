import { DataTypes, Model, Optional, Sequelize } from "sequelize";

import type { BrandingSchema } from "@tietokilta/ilmomasiina-models";

/** The branding table only ever contains one row, with this ID. */
export const BRANDING_ROW_ID = 1;

export interface BrandingAttributes extends BrandingSchema {
  id: number;
}

export interface BrandingCreationAttributes extends Optional<BrandingAttributes, "id"> {}

export class Branding extends Model<BrandingAttributes, BrandingCreationAttributes> implements BrandingAttributes {
  public id!: number;
  public headerTitle!: string | null;
  public headerTitleShort!: string | null;
  public brandColor!: string | null;
  public dangerColor!: string | null;
  public logo!: string | null;
  public favicon!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/** Default branding, used when nothing has been customized. All nulls mean "use built-in defaults". */
export const defaultBranding: BrandingSchema = {
  headerTitle: null,
  headerTitleShort: null,
  brandColor: null,
  dangerColor: null,
  logo: null,
  favicon: null,
};

/** Converts a Branding row (or null, if none exists) to the API schema. */
export function toBrandingSchema(branding: Branding | null): BrandingSchema {
  if (!branding) return defaultBranding;
  return {
    headerTitle: branding.headerTitle,
    headerTitleShort: branding.headerTitleShort,
    brandColor: branding.brandColor,
    dangerColor: branding.dangerColor,
    logo: branding.logo,
    favicon: branding.favicon,
  };
}

// Single-row table for admin-editable branding settings.

export default function setupBrandingModel(sequelize: Sequelize) {
  Branding.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      headerTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      headerTitleShort: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      brandColor: {
        type: DataTypes.STRING(7),
        allowNull: true,
      },
      dangerColor: {
        type: DataTypes.STRING(7),
        allowNull: true,
      },
      logo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      favicon: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "branding",
      freezeTableName: true,
    },
  );

  return Branding;
}
