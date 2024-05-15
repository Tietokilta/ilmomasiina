import type { Config } from 'drizzle-kit';

import envConfig from './src/config';

const config: Config = {
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/drizzle/schema.ts',
  dbCredentials: {
    host: envConfig.dbHost,
    port: envConfig.dbPort ?? 5432,
    user: envConfig.dbUser,
    password: envConfig.dbPassword,
    database: envConfig.dbDatabase,
    ssl: envConfig.dbSsl,
  },
  // Print all statements
  verbose: envConfig.debugDbLogging,
  // Always ask for confirmation
  strict: true,
};
export default config;
