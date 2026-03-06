import { Options } from "sequelize";

import appConfig from "../config";

const { dbHost, dbPort, dbSsl, dbDatabase, dbUser, dbPassword, debugDbLogging } = appConfig;

const sequelizeConfig: Options = {
  dialect: "postgres",
  host: dbHost,
  port: dbPort ?? undefined,
  database: dbDatabase,
  username: dbUser,
  password: dbPassword ?? undefined,
  dialectOptions: dbSsl ? { ssl: true } : {},
  logging: debugDbLogging,
  benchmark: debugDbLogging,
};

export = {
  // Sequelize CLI uses development as default NODE_ENV
  development: sequelizeConfig,
  // ...but make sure we can also run migrate with NODE_ENV=production
  production: sequelizeConfig,
  // Also export it under a environment-neutral name
  default: sequelizeConfig,
};
