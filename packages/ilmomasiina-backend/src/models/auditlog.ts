import { DataTypes, Model, Optional, Sequelize } from "sequelize";

import type { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { RANDOM_ID_LENGTH } from "./randomId";

export interface AuditLogAttributes {
  id: number;
  user: string | null;
  ipAddress: string;
  action: AuditEvent;
  eventId: string | null;
  eventName: string | null;
  signupId: string | null;
  signupName: string | null;
  extra: string | null;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, "id"> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: number;
  declare user: string | null;
  declare ipAddress: string;
  declare action: AuditEvent;
  declare eventId: string | null;
  declare eventName: string | null;
  declare signupId: string | null;
  declare signupName: string | null;
  declare extra: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export default function setupAuditLogModel(sequelize: Sequelize) {
  AuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      eventId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: true,
      },
      eventName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      signupId: {
        type: DataTypes.CHAR(RANDOM_ID_LENGTH),
        allowNull: true,
      },
      signupName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      extra: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "auditlog",
      freezeTableName: true,
    },
  );

  return AuditLog;
}
