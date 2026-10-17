import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Hash, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";
import { groupMessages } from "../lib/format";
import type { InboxRow, Message, Reaction } from "../lib/types";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { MessageItem } from "./MessageItem";

const PAGE = 50;
const COLUMNS = "id, conversation_id, author_id, body, attachment_path, created_at, edited_at, deleted_at";

export function Room({ room, onBack }: { room: InboxRow; onBack: () => void }) {
  const { me, profiles, ensureProfiles, onMessage, onReaction, refreshInbox, online, toast } = useStore();
  const meId = me?.id ?? "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Map<number, Reaction[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [typing, setTyping] = useState<Map<string, number>>(new Map());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const peer = room.peer_id ? profiles.get(room.peer_id) : null;

  const markRead = useCallback(() => {
    if (!meId) return;
    supabase
      .from("members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", room.id)
      .eq("user_id", meId)
      .then(() => refreshInbox());
  }, [room.id, meId, refreshInbox]);

  const loadReactions = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from("reactions").select("message_id, user_id, emoji").in("message_id", ids);
    setReactions((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, []));
      data?.forEach((r) => next.get(r.message_id)?.push(r));
      return next;
    });
  }, []);

  // initial page
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setReactions(new Map());
    stick.current = true;
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("messages").select(COLUMNS).eq("conversation_id", room.id).order("id", { ascending: false }).limit(PAGE),
        supabase.from("members").select("user_id", { count: "exact", head: true }).eq("conversation_id", room.id),
      ]);
      if (cancelled) return;
      const rows = (data ?? []).reverse();
      setMessages(rows);
      setHasMore((data ?? []).length === PAGE);
      setMemberCount(count ?? null);
      setLoading(false);
      ensureProfiles(rows.map((m) => m.author_id));
      loadReactions(rows.map((m) => m.id));
      markRead();
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id, ensureProfiles, loadReactions, markRead]);

  // live messages for this room
  useEffect(
    () =>
      onMessage((payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Message;
        if (row.conversation_id !== room.id) return;
        if (payload.eventType === "INSERT") {
          ensureProfiles([row.author_id]);
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const pending = prev.findIndex((m) => m.pending && m.author_id === row.author_id && m.body === row.body);
            if (pending >= 0) {
              const next = [...prev];
              next[pending] = { ...row, tempId: prev[pending].tempId };
              return next;
            }
            return [...prev, row];
          });
          setTyping((t) => {
            if (!t.has(row.author_id)) return t;
            const next = new Map(t);
            next.delete(row.author_id);
            return next;
          });
          if (row.author_id !== meId) markRead();
        } else if (payload.eventType === "UPDATE") {
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...row, tempId: m.tempId } : m)));
        }
      }),
    [onMessage, room.id, meId, ensureProfiles, markRead],
  );

  useEffect(
    () =>
      onReaction((payload) => {
        const r = (payload.eventType === "DELETE" ? payload.old : payload.new) as Reaction;
        setReactions((prev) => {
          if (!prev.has(r.message_id)) return prev;
          const next = new Map(prev);
          const list = (next.get(r.message_id) ?? []).filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji));
          next.set(r.message_id, payload.eventType === "DELETE" ? list : [...list, r]);
          return next;
        });
      }),
    [onReaction],
  );

  // typing indicator over Broadcast: nothing touches the database
  useEffect(() => {
    if (!meId) return;
    const ch = supabase.channel(`typing:${room.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      const uid = payload?.user_id as string;
      if (!uid) return;
      ensureProfiles([uid]);
      setTyping((t) => new Map(t).set(uid, Date.now() + 3500));
    }).subscribe();
    typingChannel.current = ch;
    const sweep = window.setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const next = new Map([...t].filter(([, exp]) => exp > now));
        return next.size === t.size ? t : next;
      });
    }, 1000);
    return () => {
      window.clearInterval(sweep);
      supabase.removeChannel(ch);
      typingChannel.current = null;
      setTyping(new Map());
    };
  }, [room.id, meId, ensureProfiles]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { user_id: meId } });
  }, [meId]);

  // keep pinned to the bottom unless the reader scrolled up
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, typing.size]);

  const onScroll = async () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && hasMore && !loading) {
      setLoading(true);
      const oldest = messages.find((m) => m.id > 0)?.id;
      const { data } = await supabase
        .from("messages")
        .select(COLUMNS)
        .eq("conversation_id", room.id)
        .lt("id", oldest ?? Number.MAX_SAFE_INTEGER)
        .order("id", { ascending: false })
        .limit(PAGE);
      const rows = (data ?? []).reverse();
      const before = el.scrollHeight;
      setMessages((prev) => [...rows, ...prev]);
      setHasMore((data ?? []).length === PAGE);
      setLoading(false);
      ensureProfiles(rows.map((m) => m.author_id));
      loadReactions(rows.map((m) => m.id));
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - before + el.scrollTop;
      });
    }
  };

  const send = useCallback(
    async (body: string, file: File | null) => {
      const tempId = crypto.randomUUID();
      const optimistic: Message = {
        id: -Date.now(),
        tempId,
        conversation_id: room.id,
        author_id: meId,
        body,
        attachment_path: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        pending: true,
      };
      stick.current = true;
      setMessages((prev) => [...prev, optimistic]);

      let attachment_path: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        attachment_path = `${room.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("attachments").upload(attachment_path, file, { contentType: file.type });
        if (error) {
          setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: "Upload failed" } : m)));
          return;
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: room.id, author_id: meId, body, attachment_path })
        .select(COLUMNS)
        .single();

      setMessages((prev) => {
        if (error) {
          const reason = error.message.includes("slow down") ? "Slow down a little" : "Not sent";
          return prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: reason } : m));
        }
        if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.tempId !== tempId || m.id === data.id);
        return prev.map((m) => (m.tempId === tempId ? { ...data, tempId } : m));
      });
    },
    [room.id, meId],
  );

  const react = useCallback(
    async (m: Message, emoji: string) => {
      const mine = reactions.get(m.id)?.some((r) => r.user_id === meId && r.emoji === emoji);
      const { error } = mine
        ? await supabase.from("reactions").delete().match({ message_id: m.id, user_id: meId, emoji })
        : await supabase.from("reactions").insert({ message_id: m.id, user_id: meId, emoji });
      if (error) toast("Couldn't react", "error");
    },
    [reactions, meId, toast],
  );

  const edit = useCallback(
    async (m: Message, body: string) => {
      const { error } = await supabase.from("messages").update({ body }).eq("id", m.id);
      if (error) toast("Couldn't edit", "error");
    },
    [toast],
  );

  const remove = useCallback(
    async (m: Message) => {
      const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", m.id);
      if (error) toast("Couldn't delete", "error");
    },
    [toast],
  );

  const rows = useMemo(() => groupMessages(messages), [messages]);
  const typers = [...typing.keys()].map((id) => profiles.get(id)?.display_name.split(" ")[0] ?? "Someone");
  const isChannel = room.kind === "channel";

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="glass z-10 flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 md:px-6">
        <button onClick={onBack} className="-ml-2 rounded-lg p-1.5 text-accent md:hidden" aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        {isChannel ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-line text-fg2">
            <Hash size={18} />
          </span>
        ) : (
          <Avatar profile={peer} size={36} online={peer ? peer.is_bot || online.has(peer.id) : undefined} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-semibold tracking-tight">{room.name}</h1>
          <p className="truncate text-[12.5px] text-fg3">
            {isChannel
              ? room.topic ?? "Channel"
              : peer?.is_bot
                ? "Bot · replies instantly"
                : peer && online.has(peer.id)
                  ? "Online"
                  : "Offline"}
          </p>
        </div>
        {isChannel && memberCount !== null && (
          <span className="flex items-center gap-1.5 rounded-full bg-line px-2.5 py-1 text-[12px] text-fg2">
            <Users size={13} /> {memberCount}
          </span>
        )}
      </header>

      <div ref={scroller} onScroll={onScroll} className="scroll-thin flex-1 overflow-y-auto pt-4 pb-2">
        {loading && messages.length === 0 ? (
          <div className="space-y-4 px-6 pt-4">
            {[60, 40, 72, 52].map((w, i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : ""}`}>
                <div className="h-10 animate-pulse rounded-[20px] bg-line" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="text-gradient text-[28px] font-bold tracking-tight">Say hello</div>
            <p className="mt-2 max-w-xs text-[14px] text-fg2">This is the start of {isChannel ? `#${room.name}` : `your chat with ${room.name}`}.</p>
          </div>
        ) : (
          rows.map((r) =>
            r.type === "day" ? (
              <div key={r.key} className="sticky top-1 z-[5] my-4 flex justify-center">
                <span className="glass rounded-full border border-line px-3 py-1 text-[11.5px] font-medium text-fg2">{r.label}</span>
              </div>
            ) : (
              <MessageItem
                key={r.key}
                message={r.message}
                author={profiles.get(r.message.author_id)}
                mine={r.message.author_id === meId}
                head={r.head}
                tail={r.tail}
                showName={isChannel}
                reactions={reactions.get(r.message.id) ?? []}
                meId={meId}
                onReact={react}
                onEdit={edit}
                onDelete={remove}
              />
            ),
          )
        )}
        <AnimatePresence>
          {typers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-2 flex items-center gap-2 px-6 text-[12.5px] text-fg3"
            >
              <span className="flex gap-1 rounded-full bg-elev px-3 py-2 shadow-[0_0_0_1px_var(--line)]">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-fg3"
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </span>
              {typers.join(", ")} {typers.length > 1 ? "are" : "is"} typing
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Composer placeholder={isChannel ? `Message #${room.name}` : `Message ${room.name}`} onSend={send} onTyping={sendTyping} />
    </section>
  );
}
