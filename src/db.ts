/**
 * GarageLog — Database helper
 *
 * Server-only handle to the team's Neon serverless Postgres database.
 * The connection string comes from `DATABASE_URL`.
 *
 * Use only inside server functions or API routes — never client code.
 */
import { neon } from "@neondatabase/serverless";

// Absolute path to migrations directory (sandbox path)
const MIGRATIONS_DIR = "/home/team/shared/site/src/db/migrations";

/** Server-only SQL query helper — returns a Neon SQL template tag. */
export const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database before running queries.",
    );
  }
  return neon(url);
};

/**
 * Run all pending migrations.
 * Safe to call on startup — migrations are idempotent (CREATE IF NOT EXISTS).
 */
export async function migrate(): Promise<{ ok: boolean; count: number; error?: string }> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { ok: false, count: 0, error: "DATABASE_URL is not set" };
  }

  try {
    const files = ["001_initial.sql", "002_sessions.sql", "003_waitlist.sql"];
    const db = neon(url);

    for (const file of files) {
      const filePath = `${MIGRATIONS_DIR}/${file}`;
      const migrationSql = await Bun.file(filePath).text();
      await db(migrationSql);
    }

    return { ok: true, count: files.length };
  } catch (err) {
    return { ok: false, count: 0, error: String(err) };
  }
}

/**
 * Check if the database is reachable and return connection info.
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { connected: false, error: "DATABASE_URL is not set" };
  }

  try {
    const db = neon(url);
    const rows = await db`SELECT version()`;
    const version = String(rows[0]?.version ?? "unknown");
    return { connected: true, version };
  } catch (err) {
    return { connected: false, error: String(err) };
  }
}
