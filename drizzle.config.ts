import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/supabase",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
