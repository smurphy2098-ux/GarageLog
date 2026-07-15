#!/usr/bin/env bun
/**
 * GarageLog — Database seed script
 *
 * Seeds the database with demo data for development.
 * Requires DATABASE_URL to be set.
 *
 * Usage:  bun run src/db/seed.ts
 *         DATABASE_URL=postgres://... bun run src/db/seed.ts
 */

import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const db = neon(url);

  console.log("🌱 Seeding GarageLog database...");

  // Run migrations first
  const migrationSql = await readFile(join(__dirname, "migrations", "001_initial.sql"), "utf8");
  await db(migrationSql);
  console.log("✅ Migrations applied");

  // Run seed data
  const seedSql = await readFile(join(__dirname, "seed.sql"), "utf8");
  await db(seedSql);
  console.log("✅ Seed data inserted");

  console.log("🎉 Database seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});