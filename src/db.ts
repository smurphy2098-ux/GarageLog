import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Server-only handle to the team's database (Neon serverless Postgres over HTTP).
 * The connection string comes from `DATABASE_URL`, which the owner connects via
 * the database card and which is injected into the sandbox and passed to the live
 * host on publish. Resolved lazily (per call, not at module load) so the site
 * still builds and serves before a database is connected — the error only
 * surfaces if a query actually runs without `DATABASE_URL`.
 *
 * Use it only inside a `createServerFn()` handler or an API route (never client code):
 *
 *   const getPosts = createServerFn().handler(async () => {
 *     const rows = await sql()`select id, title, created_at from posts`;
 *     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
 *   });
 */
export const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries.",
    );
  }
  return neon(url);
};

/**
 * Run all pending migrations (executes migration files in order).
 * Safe to call on startup — migrations are idempotent (CREATE IF NOT EXISTS).
 */
export async function migrate(): Promise<{ ok: boolean; count: number; error?: string }> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { ok: false, count: 0, error: "DATABASE_URL is not set" };
  }

  try {
    const migrationsDir = join(__dirname, "migrations");
    const files = ["001_initial.sql"]; // ordered list of migrations

    const db = neon(url);
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      await db(sql);
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