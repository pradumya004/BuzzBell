// Runs against a real Supabase project (.env.local). Signs in three guests and
// checks that Row Level Security holds when a client misbehaves on purpose.
// Test users are deleted afterwards when SUPABASE_DB_URL is set.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key, SUPABASE_DB_URL: dbUrl } = process.env;
const enabled = !!(url && key);

const client = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

async function guest() {
  const c = client();
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return { c, id: data.user!.id };
}

describe.skipIf(!enabled)("row level security", () => {
  let a: { c: SupabaseClient; id: string };
  let b: { c: SupabaseClient; id: string };
  let outsider: { c: SupabaseClient; id: string };
  let dm: string;
  let dmMessage: number;

  beforeAll(async () => {
    [a, b, outsider] = await Promise.all([guest(), guest(), guest()]);
    const { data, error } = await a.c.rpc("open_dm", { p_other: b.id });
    if (error) throw error;
    dm = data as string;
    const sent = await a.c.from("messages").insert({ conversation_id: dm, author_id: a.id, body: "secret plan zebra" }).select("id").single();
    if (sent.error) throw sent.error;
    dmMessage = sent.data.id;
  }, 30_000);

  afterAll(async () => {
    if (!a || !dbUrl) return;
    const db = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await db.connect();
    await db.query("delete from public.conversations where dm_key like any($1)", [[`%${a.id}%`, `%${b.id}%`, `%${outsider.id}%`]]);
    await db.query("delete from auth.users where id = any($1)", [[a.id, b.id, outsider.id]]);
    await db.end();
  });

  it("signed-out clients read nothing", async () => {
    const { data } = await client().from("messages").select("id").limit(1);
    expect(data).toEqual([]);
  });

  it("new guests are auto-joined to public channels", async () => {
    const { data } = await outsider.c.rpc("inbox");
    const names = (data as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(["general", "show-and-tell", "random"]));
  });

  it("DM participants can read the DM", async () => {
    const { data } = await b.c.from("messages").select("body").eq("id", dmMessage);
    expect(data?.[0]?.body).toBe("secret plan zebra");
  });

  it("outsiders cannot read someone else's DM", async () => {
    const { data } = await outsider.c.from("messages").select("id").eq("conversation_id", dm);
    expect(data).toEqual([]);
    const conv = await outsider.c.from("conversations").select("id").eq("id", dm);
    expect(conv.data).toEqual([]);
  });

  it("outsiders cannot find DM messages through search", async () => {
    const { data } = await outsider.c.rpc("search_messages", { q: "zebra" });
    expect(data).toEqual([]);
    const own = await a.c.rpc("search_messages", { q: "zebra" });
    expect((own.data as unknown[]).length).toBe(1);
  });

  it("outsiders cannot post into a DM or join it", async () => {
    const post = await outsider.c.from("messages").insert({ conversation_id: dm, author_id: outsider.id, body: "hi" });
    expect(post.error).not.toBeNull();
    const join = await outsider.c.from("members").insert({ conversation_id: dm, user_id: outsider.id });
    expect(join.error).not.toBeNull();
  });

  it("nobody can post as someone else", async () => {
    const { error } = await b.c.from("messages").insert({ conversation_id: dm, author_id: a.id, body: "spoof" });
    expect(error).not.toBeNull();
  });

  it("only the author can edit or delete a message", async () => {
    const { data } = await b.c.from("messages").update({ body: "edited by b" }).eq("id", dmMessage).select("id");
    expect(data).toEqual([]);
    const own = await a.c.from("messages").update({ body: "secret plan zebra v2" }).eq("id", dmMessage).select("body, edited_at").single();
    expect(own.data?.body).toBe("secret plan zebra v2");
    expect(own.data?.edited_at).not.toBeNull();
  });

  it("clients cannot promote themselves to a bot or move a message", async () => {
    const bot = await a.c.from("profiles").update({ is_bot: true }).eq("id", a.id);
    expect(bot.error).not.toBeNull();
    const move = await a.c.from("messages").update({ conversation_id: dm }).eq("id", dmMessage);
    expect(move.error).not.toBeNull();
  });

  it("outsiders cannot upload into a DM's storage folder", async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    const { error } = await outsider.c.storage.from("attachments").upload(`${dm}/x.png`, png);
    expect(error).not.toBeNull();
  });

  it("BuzzBot answers DMs", async () => {
    const { data: botDm } = await outsider.c.rpc("inbox");
    const room = (botDm as { id: string; kind: string; name: string }[]).find((r) => r.kind === "dm" && r.name === "BuzzBot");
    expect(room).toBeDefined();
    await outsider.c.from("messages").insert({ conversation_id: room!.id, author_id: outsider.id, body: "hello" });
    const { data } = await outsider.c.from("messages").select("body, author_id").eq("conversation_id", room!.id).order("id");
    const last = data!.at(-1)!;
    expect(last.author_id).not.toBe(outsider.id);
    expect(last.body).toMatch(/BuzzBot/);
  });

  it("rate-limits floods: 8 messages per 10 seconds", async () => {
    const results = [];
    for (let i = 0; i < 9; i++) {
      results.push(await b.c.from("messages").insert({ conversation_id: dm, author_id: b.id, body: `flood ${i}` }));
    }
    expect(results.slice(0, 8).every((r) => !r.error)).toBe(true);
    expect(results[8].error?.message).toMatch(/slow down/);
  });
});
