import type { Model } from "sequelize";

// For whatever reason, Sequelize doesn't do this automatically for MySQL, but
// only passes stuff through JSON.stringify when going JS->DB.
// Postgres does it at the datatype level, but custom data types and TypeScript
// are too much for Sequelize v6.

/** Getter for JSON columns that deserializes string values. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- unsafe, but hard to fix
export const jsonColumnGetter = <T>(name: string) =>
  function getJsonColumn(this: Model): T {
    const json = this.getDataValue(name) as string | T;
    if (this.sequelize.getDialect() === "postgres") return json as T;
    return typeof json === "string" ? (JSON.parse(json) as T) : json;
  };
