// Offline SQL tests: runs every migration on PGlite (Postgres in WASM) with stand-ins for Supabase's
// auth, storage, roles and realtime publication.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../supabase", import.meta.url));

const db = new PGlite();

const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create publication supabase_realtime;
create function public.crypt(text, text) returns text language sql as $$ select md5($1 || $2) $$;
create function public.gen_salt(text) returns text language sql as $$ select 'salt' $$;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant all on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failures++;
};

async function as(uid, fn) {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; set request.jwt.claim.sub = '${uid ?? ""}';`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub;");
  }
}
const q = (sql, params) => db.query(sql, params);
const tryQ = async (sql, params) => {
  try {
    return { rows: (await q(sql, params)).rows, error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  }
};

await db.exec(STUB);
for (const f of readdirSync(`${ROOT}/migrations`).sort()) {
  let sql = readFileSync(`${ROOT}/migrations/${f}`, "utf8").replace(/create extension[^;]+;/g, "");
  try {
    await db.exec(sql);
    console.log(`applied ${f}`);
  } catch (e) {
    console.log(`FAILED ${f}: ${e.message}`);
    process.exit(1);
  }
}
await db.exec(readFileSync(`${ROOT}/seed.sql`, "utf8"));
await db.exec(readFileSync(`${ROOT}/seed.sql`, "utf8")); // idempotent re-run
console.log("seeded twice");

const counts = (await q("select (select count(*) from profiles) p, (select count(*) from conversations where kind='channel') c, (select count(*) from messages) m")).rows[0];
check("seed: 4 profiles, 3 channels", Number(counts.p) === 4 && Number(counts.c) === 3, JSON.stringify(counts));

// three guests
const ids = ["a", "b", "c"].map((_, i) => `00000000-0000-4000-9000-00000000000${i + 1}`);
for (const id of ids) {
  await q(`insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values ($1, null, '{}', true)`, [id]);
}
const [A, B, C] = ids;
const pa = (await q("select display_name, is_guest from profiles where id=$1", [A])).rows[0];
check("guest gets profile with generated name", pa?.is_guest && /^Guest /.test(pa.display_name), JSON.stringify(pa));

const inboxC = await as(C, () => q("select name, kind from inbox()"));
check("guest auto-joined 3 channels", inboxC.rows.filter((r) => r.kind === "channel").length === 3, JSON.stringify(inboxC.rows));
check("guest has BuzzBot welcome DM", inboxC.rows.some((r) => r.kind === "dm" && r.name === "BuzzBot"));

const dm = (await as(A, () => q("select open_dm($1) id", [B]))).rows[0].id;
const dm2 = (await as(B, () => q("select open_dm($1) id", [A]))).rows[0].id;
check("open_dm is idempotent from either side", dm === dm2);
const self = await as(A, () => tryQ("select open_dm($1)", [A]));
check("cannot DM yourself", !!self.error);

const sent = await as(A, () => q("insert into messages (conversation_id, author_id, body) values ($1,$2,'secret plan zebra') returning id", [dm, A]));
const mid = sent.rows[0].id;

check("signed-out reads nothing", (await as(null, () => tryQ("select id from messages"))).rows.length === 0);
check("participant reads DM", (await as(B, () => q("select body from messages where id=$1", [mid]))).rows[0]?.body === "secret plan zebra");
check("outsider cannot read DM", (await as(C, () => q("select id from messages where conversation_id=$1", [dm]))).rows.length === 0);
check("outsider cannot see DM row", (await as(C, () => q("select id from conversations where id=$1", [dm]))).rows.length === 0);
check("outsider search finds nothing", (await as(C, () => q("select * from search_messages('zebra')"))).rows.length === 0);
check("participant search finds it", (await as(A, () => q("select * from search_messages('zebra')"))).rows.length === 1);
check("outsider cannot post into DM", !!(await as(C, () => tryQ("insert into messages (conversation_id, author_id, body) values ($1,$2,'x')", [dm, C]))).error);
check("outsider cannot join DM", !!(await as(C, () => tryQ("insert into members (conversation_id, user_id) values ($1,$2)", [dm, C]))).error);
check("cannot post as someone else", !!(await as(B, () => tryQ("insert into messages (conversation_id, author_id, body) values ($1,$2,'spoof')", [dm, A]))).error);

const bEdit = await as(B, () => q("update messages set body='edited by b' where id=$1 returning id", [mid]));
check("non-author edit affects 0 rows", bEdit.rows.length === 0);
const aEdit = await as(A, () => q("update messages set body='v2' where id=$1 returning body, edited_at", [mid]));
check("author edit stamps edited_at", aEdit.rows[0]?.body === "v2" && aEdit.rows[0]?.edited_at);
check("cannot become a bot", !!(await as(A, () => tryQ("update profiles set is_bot=true where id=$1", [A]))).error);
check("cannot move a message", !!(await as(A, () => tryQ("update messages set conversation_id=$1 where id=$2", [dm, mid]))).error);

const del = await as(A, () => q("update messages set deleted_at=now() where id=$1 returning body", [mid]));
check("soft delete clears body", del.rows[0]?.body === "");

check("outsider cannot upload to DM folder", !!(await as(C, () => tryQ("insert into storage.objects (bucket_id, name) values ('attachments', $1)", [`${dm}/x.png`]))).error);
check("participant can upload to DM folder", !(await as(A, () => tryQ("insert into storage.objects (bucket_id, name) values ('attachments', $1)", [`${dm}/x.png`]))).error);

const general = (await q("select id from conversations where slug='general'")).rows[0].id;
const msgG = (await q("select id from messages where conversation_id=$1 limit 1", [general])).rows[0].id;
check("member can react", !(await as(C, () => tryQ("insert into reactions (message_id, user_id, emoji) values ($1,$2,'🔥')", [msgG, C]))).error);
check("only allowed emoji", !!(await as(C, () => tryQ("insert into reactions (message_id, user_id, emoji) values ($1,$2,'💩')", [msgG, C]))).error);
check("cannot react as someone else", !!(await as(C, () => tryQ("insert into reactions (message_id, user_id, emoji) values ($1,$2,'👍')", [msgG, A]))).error);

const botDm = (await as(C, () => q("select id from inbox() where kind='dm' and name='BuzzBot'"))).rows[0].id;
await as(C, () => q("insert into messages (conversation_id, author_id, body) values ($1,$2,'hello there')", [botDm, C]));
const last = (await as(C, () => q("select author_id, body from messages where conversation_id=$1 order by id desc limit 1", [botDm]))).rows[0];
check("BuzzBot replies to DMs", last.author_id !== C && /BuzzBot/.test(last.body), JSON.stringify(last));
const how = await as(C, async () => {
  await q("insert into messages (conversation_id, author_id, body) values ($1,$2,'how was this built?')", [botDm, C]);
  return (await q("select body from messages where conversation_id=$1 order by id desc limit 1", [botDm])).rows[0].body;
});
check("BuzzBot keyword answer", /Supabase/.test(how), how);


const ch = await as(A, () => q("select create_channel('Launch Plans!', 'ship it') id"));
const slug = (await q("select slug from conversations where id=$1", [ch.rows[0].id])).rows[0].slug;
check("create_channel slugifies", slug === "launch-plans", slug);
check("duplicate channel rejected", !!(await as(B, () => tryQ("select create_channel('launch plans')"))).error);
check("B can join public channel", !(await as(B, () => tryQ("insert into members (conversation_id, user_id) values ($1,$2)", [ch.rows[0].id, B]))).error);

let flood = [];
await as(B, async () => {
  for (let i = 0; i < 9; i++) flood.push(await tryQ("insert into messages (conversation_id, author_id, body) values ($1,$2,$3)", [general, B, `flood ${i}`]));
});
check("rate limit: 8 ok then blocked", flood.slice(0, 8).every((r) => !r.error) && /slow down/.test(flood[8].error ?? ""), flood[8].error ?? "no error");

const unread = (await as(A, () => q("select name, unread from inbox() where kind='channel' and name='general'"))).rows[0];
check("inbox unread counts others' messages", unread.unread >= 1, JSON.stringify(unread));
const markRead = await as(A, () => tryQ("update members set last_read_at=now() where conversation_id=$1 and user_id=$2 returning user_id", [general, A]));
check("can mark own read state", markRead.rows.length === 1, markRead.error ?? "");
check("cannot change own role", !!(await as(A, () => tryQ("update members set role='owner' where conversation_id=$1 and user_id=$2", [general, A]))).error);

console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
