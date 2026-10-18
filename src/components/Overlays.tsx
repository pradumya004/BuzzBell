import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Hash, Loader2, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";
import { formatAgo } from "../lib/format";
import { Avatar } from "./Avatar";
import type { Profile } from "../lib/types";

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="glass w-full max-w-lg overflow-hidden rounded-3xl border border-line shadow-2xl"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Hit = { id: number; conversation_id: string; body: string; author: string; created_at: string };

export function SearchPalette({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const { inbox } = useStore();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    setBusy(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_messages", { q });
      setHits((data as Hit[]) ?? []);
      setBusy(false);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const rooms = useMemo(() => new Map(inbox.map((r) => [r.id, r])), [inbox]);
  const roomMatches = q ? inbox.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex items-center gap-3 border-b border-line px-5">
        {busy ? <Loader2 size={18} className="animate-spin text-fg3" /> : <Search size={18} className="text-fg3" />}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search messages and rooms"
          className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg3"
        />
        <kbd className="rounded-md border border-line px-1.5 text-[11px] text-fg3">esc</kbd>
      </div>
      <div className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
        {roomMatches.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              onOpen(r.id);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-line"
          >
            <Hash size={15} className="text-fg3" />
            <span className="text-[14px] font-medium">{r.name}</span>
          </button>
        ))}
        {hits.map((h) => (
          <button
            key={h.id}
            onClick={() => {
              onOpen(h.conversation_id);
              onClose();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-line"
          >
            <div className="flex items-baseline justify-between gap-2 text-[12px] text-fg3">
              <span>
                <span className="font-medium text-fg2">{h.author}</span> in {rooms.get(h.conversation_id)?.name ?? "a room"}
              </span>
              {formatAgo(h.created_at)}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[14px]">{h.body}</div>
          </button>
        ))}
        {q.trim().length >= 2 && !busy && !hits.length && !roomMatches.length && (
          <p className="px-3 py-6 text-center text-[14px] text-fg3">No matches. Search runs on Postgres full-text, whole words.</p>
        )}
        {q.trim().length < 2 && <p className="px-3 py-6 text-center text-[14px] text-fg3">Try “webhook” or “dark mode”.</p>}
      </div>
    </Sheet>
  );
}

export function NewChat({
  tab: initial,
  onClose,
  onOpen,
}: {
  tab: "channel" | "dm" | null;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { me, online, refreshInbox, toast } = useStore();
  const [tab, setTab] = useState<"channel" | "dm">("channel");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setTab(initial);
      setName("");
      setTopic("");
      setQ("");
    }
  }, [initial]);

  const [found, setFound] = useState<Profile[]>([]);

  // search the server, not the session cache, so people who joined later show up
  useEffect(() => {
    if (initial !== "dm" && tab !== "dm") return;
    const t = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_hue, is_guest, is_bot")
        .order("created_at", { ascending: false })
        .limit(40);
      if (q.trim()) query = query.ilike("display_name", `%${q.trim().replace(/[%_]/g, "")}%`);
      const { data } = await query;
      setFound(data ?? []);
    }, 150);
    return () => clearTimeout(t);
  }, [q, tab, initial]);

  const people = found
    .filter((p) => p.id !== me?.id)
    .sort((a, b) => Number(online.has(b.id) || b.is_bot) - Number(online.has(a.id) || a.is_bot));

  const done = (id: string) => {
    refreshInbox();
    onOpen(id);
    onClose();
  };

  const createChannel = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_channel", { p_name: name, p_topic: topic });
    setBusy(false);
    if (error) return toast(error.message, "error");
    done(data as string);
  };

  const dm = async (id: string) => {
    const { data, error } = await supabase.rpc("open_dm", { p_other: id });
    if (error) return toast(error.message, "error");
    done(data as string);
  };

  return (
    <Sheet open={!!initial} onClose={onClose}>
      <div className="flex gap-1 border-b border-line p-2">
        {(["channel", "dm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "relative flex-1 rounded-xl py-2 text-[14px] font-medium transition",
              tab === t ? "text-fg" : "text-fg3 hover:text-fg2",
            )}
          >
            {tab === t && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-line" />}
            <span className="relative">{t === "channel" ? "New channel" : "Message someone"}</span>
          </button>
        ))}
      </div>
      {tab === "channel" ? (
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            createChannel();
          }}
        >
          <label className="block">
            <span className="text-[12px] font-medium text-fg2">Name</span>
            <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-line bg-elev px-3 focus-within:border-accent">
              <Hash size={16} className="text-fg3" />
              <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="launch-plans" className="flex-1 bg-transparent text-[15px] outline-none" />
            </div>
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-fg2">Topic (optional)</span>
            <input value={topic} maxLength={140} onChange={(e) => setTopic(e.target.value)} placeholder="What's it for?" className="mt-1 h-11 w-full rounded-xl border border-line bg-elev px-3 text-[15px] outline-none focus:border-accent" />
          </label>
          <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-medium text-white disabled:opacity-70">
            {busy && <Loader2 size={16} className="animate-spin" />} Create channel
          </button>
        </form>
      ) : (
        <div>
          <div className="px-5 pt-4">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find people" className="h-11 w-full rounded-xl border border-line bg-elev px-3 text-[15px] outline-none focus:border-accent" />
          </div>
          <ul className="scroll-thin max-h-[46vh] overflow-y-auto p-2">
            {people.map((p) => (
              <li key={p.id}>
                <button onClick={() => dm(p.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-line">
                  <Avatar profile={p} size={34} online={p.is_bot || online.has(p.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{p.display_name}</span>
                    <span className="block truncate text-[12px] text-fg3">{p.is_bot ? "Bot" : p.is_guest ? "Guest" : `@${p.username}`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className={clsx(
              "glass pointer-events-auto rounded-full border px-4 py-2.5 text-[14px] shadow-xl",
              t.tone === "error" ? "border-red-500/40 text-red-600 dark:text-red-400" : "border-line",
            )}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
