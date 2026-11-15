import debug from "debug";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { Pool } from "pg";

import config from "../config";
import { relations } from "./relations";

const debugLog = debug("app:db");

export type Db = NodePgDatabase<typeof relations>;
/** A transaction started with `db.transaction()`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Either the database or a transaction on it. Use for functions that can run inside or outside one. */
export type DbOrTx = Db | Tx;
/** The `where` filter of relational queries (`db.query.<table>`) on the given table. */
export type Filter<Table extends keyof Db["query"]> = NonNullable<
  NonNullable<Parameters<Db["query"][Table]["findMany"]>[0]>["where"]
>;

/**
 * The most values to pass to a single query as a list. A query can have at most 65535 parameters,
 * so split longer lists with lodash's `chunk()`.
 */
export const MAX_LIST_PARAMS = 10000;

const MIGRATIONS_FOLDER = path.resolve(__dirname, "../../drizzle");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

/** The last migration of the Sequelize-based versions. Its schema equals our initial migration. */
const LAST_SEQUELIZE_MIGRATION = "0010-add-preferredFrontend";

let pool: Pool | null = null;
let db: Db | null = null;

export function getDb(): Db {
  if (!db) throw new Error("setupDatabase() has not been called");
  return db;
}

export async function closeDatabase() {
  if (pool) {
    const old = pool;
    pool = null;
    db = null;
    await old.end();
  }
}

/**
 * Databases created by Sequelize-based versions already have the schema of our initial migration.
 * Record that migration as applied for them, so that only later migrations are run.
 */
async function adoptSequelizeDatabase(database: Db) {
  const tableExists = async (name: string) => {
    const [row] = await database.execute<{ name: string | null }>(sql`SELECT to_regclass(${name}) AS name`, "objects");
    return row.name != null;
  };
  if (!(await tableExists('public."SequelizeMeta"'))) return;
  if (await tableExists(`${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`)) return;

  const applied = await database.execute(
    sql`SELECT 1 FROM "SequelizeMeta" WHERE name = ${LAST_SEQUELIZE_MIGRATION}`,
    "objects",
  );
  if (!applied.length) {
    throw new Error(
      "This database was created by an older version of Ilmomasiina. " +
        "Start the last Sequelize-based version once to run its migrations, then upgrade to this version.",
    );
  }

  const [initial] = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  await database.transaction(async (tx) => {
    debugLog(`Adopting existing database: recording migration ${initial.name} as applied`);
    // Events created before defaultLanguage existed have no value; they used the configured default.
    // A later migration makes the column required.
    await tx.execute(
      sql`UPDATE "event" SET "defaultLanguage" = ${config.defaultLanguage} WHERE "defaultLanguage" IS NULL`,
    );
    await tx.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`);
    // Same table as created by drizzle-orm's migrator.
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint,
        name text,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);
    await tx.execute(sql`
      INSERT INTO ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at", "name")
      VALUES (${initial.hash}, ${initial.folderMillis}, ${initial.name})
    `);
  });
}

/**
 * drizzle-orm's migrator keeps its table in a schema of its own and runs CREATE SCHEMA IF NOT EXISTS
 * on every start. Postgres only allows that with the CREATE privilege on the database, even when the
 * schema already exists. Fail with instructions instead of a bare permission error.
 */
async function ensureCanMigrate(database: Db) {
  const [row] = await database.execute<{ allowed: boolean }>(
    sql`SELECT has_database_privilege(current_database(), 'CREATE') AS allowed`,
    "objects",
  );
  if (!row.allowed) {
    throw new Error(
      `Database user "${config.dbUser}" needs the CREATE privilege on database "${config.dbDatabase}" ` +
        "to run migrations. Grant it as a database superuser:\n" +
        `  GRANT CREATE ON DATABASE "${config.dbDatabase}" TO "${config.dbUser}";`,
    );
  }
}

async function runMigrations(database: Db, connections: Pool) {
  debugLog("Running database migrations");
  await ensureCanMigrate(database);
  // Several instances may start at the same time. Let them migrate one at a time.
  const lock = await connections.connect();
  try {
    await lock.query("SELECT pg_advisory_lock(hashtext($1))", [`${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`]);
    await adoptSequelizeDatabase(database);
    await migrate(database, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsSchema: MIGRATIONS_SCHEMA,
      migrationsTable: MIGRATIONS_TABLE,
    });
  } finally {
    // Closing the connection releases the lock.
    lock.release(true);
  }
}

export default async function setupDatabase(): Promise<Db> {
  if (db) return db;

  debugLog("Connecting to database");
  const newPool = new Pool({
    host: config.dbHost,
    port: config.dbPort ?? undefined,
    database: config.dbDatabase,
    user: config.dbUser,
    password: config.dbPassword ?? undefined,
    ssl: config.dbSsl,
  });
  // Idle connections emit errors when the server closes them, e.g. on a database restart.
  // The pool replaces them on its own; without a listener, the error would crash the process.
  newPool.on("error", (err) => console.error("Database connection error:", err));
  const newDb = drizzle({
    client: newPool,
    relations,
    logger: config.debugDbLogging,
  });
  try {
    await newDb.execute(sql`SELECT 1`);
    debugLog(`Connected to ${config.dbHost}:${config.dbPort ?? 5432} as ${config.dbUser}.`);
  } catch (err) {
    console.error(`Error connecting to ${config.dbHost}:${config.dbPort ?? 5432} as ${config.dbUser}: ${String(err)}`);
    await newPool.end();
    throw err;
  }

  try {
    await runMigrations(newDb, newPool);
  } catch (err) {
    await newPool.end();
    throw err;
  }

  pool = newPool;
  db = newDb;
  return newDb;
}
