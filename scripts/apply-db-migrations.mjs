// Applies every SQL file in db/migrations/ to the database SUPABASE_DB_URL
// points at, in filename order, inside one transaction per file.
//
// Why this exists: the Supabase project that backs local development lives
// outside this repo, so a fresh clone has the code that reads `public.awards`
// but no table to read. This script is the portable half — it carries the
// schema and its seed rows with the code.
//
// Every migration here MUST be idempotent (`CREATE TABLE IF NOT EXISTS`,
// `ON CONFLICT DO NOTHING`, and so on). There is no ledger of what has already
// run: re-running the whole directory is the normal, expected operation, and a
// migration that cannot survive that is a bug in the migration.
//
// Usage:
//   SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres \
//     pnpm db:migrate
// or put SUPABASE_DB_URL in .env.local (gitignored) and just run `pnpm db:migrate`.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "db", "migrations");

/**
 * Reads SUPABASE_DB_URL from the environment, falling back to a bare parse of
 * .env.local so the common case needs no exported variable. Deliberately not
 * a dotenv dependency — one key, one file, no interpolation rules to honor.
 */
function resolveDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    return null;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*SUPABASE_DB_URL\s*=\s*(.*)$/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  return null;
}

function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();

  if (!databaseUrl) {
    console.error(
      [
        "SUPABASE_DB_URL is not set.",
        "",
        "Point it at the Postgres behind your Supabase instance, then re-run:",
        "  SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres pnpm db:migrate",
        "",
        "For a local Supabase stack, `supabase status -o env` prints the exact DB_URL.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const migrations = listMigrations();
  if (migrations.length === 0) {
    console.log("No migrations found in db/migrations/ — nothing to do.");
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
  } catch (error) {
    console.error(
      `Could not connect to the database: ${error.message}\n` +
        "Is the Supabase stack running, and does SUPABASE_DB_URL point at it?",
    );
    process.exitCode = 1;
    return;
  }

  try {
    for (const name of migrations) {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      // One transaction per file: a migration either lands whole or not at all,
      // so a failure halfway through cannot leave a table without its policies.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`✓ ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${name} failed: ${error.message}`);
      }
    }
    console.log(`\nApplied ${migrations.length} migration(s).`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
