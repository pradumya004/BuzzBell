// Migration runner: applies supabase/migrations/*.sql in order, once each,
// tracked in public.schema_migrations. `--seed` also runs supabase/seed.sql.
// Usage: node scripts/db.mjs [--status] [--seed]
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set (.env.local)");
  process.exit(1);
}

const dir = new URL("../supabase/migrations/", import.meta.url);
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(`create table if not exists public.schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  await client.query("alter table public.schema_migrations enable row level security");

  const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  if (process.argv.includes("--status")) {
    for (const f of files) console.log(`${done.has(f) ? "applied" : "pending"}  ${f}`);
  } else {
    for (const f of files.filter((f) => !done.has(f))) {
      const sql = await readFile(new URL(f, dir), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations (name) values ($1)", [f]);
        await client.query("commit");
        console.log(`applied  ${f}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`${f}: ${err.message}`);
      }
    }
    if (process.argv.includes("--seed")) {
      await client.query(await readFile(new URL("../seed.sql", dir), "utf8"));
      console.log("seeded");
    }
  }
} finally {
  await client.end();
}
