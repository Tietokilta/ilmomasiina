import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { resolve } from 'path';
import postgres from 'postgres';

import config from '../config';
import * as relations from './relations';
import * as schema from './schema';

export const client = postgres({
  host: config.dbHost,
  port: config.dbPort ?? 5432,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbDatabase,
  ssl: config.dbSsl,
});

// { schema } is used for relational queries
export const db = drizzle(client, { schema: { ...schema, ...relations }, logger: config.debugDbLogging });
export type Transaction = Parameters<Parameters<typeof db['transaction']>[0]>[0];
export const runMigrations = async () => {
  const migrationClient = postgres({
    host: config.dbHost,
    port: config.dbPort ?? 5432,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbDatabase,
    ssl: config.dbSsl,
    // for migrations, we want to be able to run multiple queries in a single transaction
    max: 1,
  });
  await migrate(drizzle(migrationClient), { migrationsFolder: resolve('./drizzle') });
};
