import { readFile } from "node:fs/promises";
import postgres from "postgres";

const [migrationPath] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est absente de l’environnement.");

if (migrationPath === "--diagnose") {
  const target = new URL(process.env.DATABASE_URL);
  console.log(`Cible configurée : protocole=${target.protocol} hôte=${target.hostname} port=${target.port || "défaut"} utilisateur=${target.username || "absent"}`);
  process.exit(0);
}
if (!migrationPath) throw new Error("Indiquez le chemin de la migration SQL à appliquer.");
if (new URL(process.env.DATABASE_URL).protocol !== "postgres:") throw new Error("DATABASE_URL ne cible pas PostgreSQL/Supabase : la migration est volontairement bloquée.");

const migration = await readFile(migrationPath, "utf8");
const statements = migration
  .split("--> statement-breakpoint")
  .map(statement => statement.trim())
  .filter(Boolean);

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require", idle_timeout: 20, connect_timeout: 10 });
try {
  await sql.begin(async transaction => {
    for (const statement of statements) await transaction.unsafe(statement);
  });
  console.log(`Migration Supabase appliquée : ${migrationPath} (${statements.length} instruction(s)).`);
} finally {
  await sql.end({ timeout: 5 });
}
