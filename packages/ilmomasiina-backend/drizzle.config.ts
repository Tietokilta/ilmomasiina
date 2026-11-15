import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE ?? "",
    ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1",
  },
});
