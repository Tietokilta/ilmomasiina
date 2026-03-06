/* eslint-disable import/prefer-default-export */

import type { Model } from "sequelize";

// For whatever reason, Sequelize doesn't do this automatically for MySQL, but
// only passes stuff through JSON.stringify when going JS->DB.
// Postgres does it at the datatype level, but custom data types and TypeScript
// are too much for Sequelize v6.

/** Getter for JSON columns that deserializes string values. */
export const jsonColumnGetter = <T>(name: string) =>
  function getJsonColumn(this: Model): T {
    const json = this.getDataValue(name);
    if (this.sequelize.getDialect() === "postgres") return json;
    return typeof json === "string" ? JSON.parse(json as unknown as string) : json;
  };
