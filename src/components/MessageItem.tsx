import { memo, useEffect, useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { Pencil, SmilePlus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatTime } from "../lib/format";
import { EMOJIS, type Message, type Profile, type Reaction } from "../lib/types";
import { Avatar } from "./Avatar";

const urlCache = new Map<string, string>();

function Attachment({ path }: { path: string }) {
  const [url, setUrl] = useState(urlCache.get(path));
  useEffect(() => {
    if (url) return;
    supabase.storage
      .from("attachments")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!data) return;
        urlCache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
  }, [path, url]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="attachment" className="max-h-72 max-w-full rounded-2xl object-cover" loading="lazy" />
    </a>
  ) : (
    <div className="h-48 w-64 animate-pulse rounded-2xl bg-line" />
  );
}

type Props = {
  message: Message;
  author?: Profile;
  mine: boolean;
  head: boolean;
  tail: boolean;
  showName: boolean;
  reactions: Reaction[];
  meId: string;
  onReact: (m: Message, emoji: string) => void;
  onEdit: (m: Message, body: string) => void;
  onDelete: (m: Message) => void;
};

export const MessageItem = memo(function MessageItem({
  message: m, author, mine, head, tail, showName, reactions, meId, onReact, onEdit, onDelete,
}: Props) {
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const deleted = !!m.deleted_at;

  const counts = EMOJIS.map((e) => ({
    emoji: e,
    n: reactions.filter((r) => r.emoji === e).length,
    mine: reactions.some((r) => r.emoji === e && r.user_id === meId),
  })).filter((c) => c.n > 0);

  const radius = mine
    ? clsx("rounded-[20px]", !head && "rounded-tr-md", !tail && "rounded-br-md")
    : clsx("rounded-[20px]", !head && "rounded-tl-md", !tail && "rounded-bl-md");

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: m.pending ? 0.6 : 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={clsx("group flex gap-2 px-4 md:px-6", mine ? "flex-row-reverse" : "flex-row", head ? "mt-3" : "mt-0.5")}
    >
      <div className="w-8 shrink-0 self-end">{!mine && tail && <Avatar profile={author} size={32} />}</div>

      <div className={clsx("flex max-w-[min(560px,78%)] flex-col", mine ? "items-end" : "items-start")}>
        {head && showName && !mine && (
          <div className="mb-1 ml-3 flex items-baseline gap-2 text-[12px]">
            <span className="font-semibold text-fg2">{author?.display_name ?? "…"}</span>
            <span className="text-fg3">{formatTime(m.created_at)}</span>
          </div>
        )}

        <div className={clsx("relative flex items-center gap-1", mine ? "flex-row-reverse" : "flex-row")}>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim() && draft !== m.body) onEdit(m, draft.trim());
                setEditing(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                className="h-10 min-w-[240px] rounded-2xl border border-accent bg-elev px-3.5 text-[15px] outline-none"
              />
            </form>
          ) : (
            <div
              className={clsx(
                "text-[15px] leading-[1.4] break-words whitespace-pre-wrap",
                deleted
                  ? "rounded-[20px] border border-dashed border-line px-3.5 py-2 text-fg3 italic"
                  : m.attachment_path && !m.body
                    ? ""
                    : clsx("px-3.5 py-2", radius, mine ? "bg-me text-white" : "bg-elev shadow-[0_0_0_1px_var(--line)]"),
                m.failed && "ring-2 ring-red-500/70",
              )}
            >
              {deleted ? (
                "Message deleted"
              ) : (
                <>
                  {m.attachment_path && <div className={m.body ? "mb-2" : ""}><Attachment path={m.attachment_path} /></div>}
                  {m.body}
                </>
              )}
            </div>
          )}

          {!deleted && !m.pending && !editing && (
            <div
              className={clsx(
                "flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100",
                picker && "opacity-100",
              )}
            >
              <button
                aria-label="React"
                onClick={() => setPicker((p) => !p)}
                className="rounded-full p-1.5 text-fg3 transition hover:bg-line hover:text-fg"
              >
                <SmilePlus size={16} />
              </button>
              {mine && !m.attachment_path && (
                <button aria-label="Edit" onClick={() => setEditing(true)} className="rounded-full p-1.5 text-fg3 transition hover:bg-line hover:text-fg">
                  <Pencil size={15} />
                </button>
              )}
              {mine && (
                <button aria-label="Delete" onClick={() => onDelete(m)} className="rounded-full p-1.5 text-fg3 transition hover:bg-line hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          {picker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={clsx(
                "glass absolute -top-12 z-20 flex gap-0.5 rounded-full border border-line p-1 shadow-xl",
                mine ? "right-0" : "left-0",
              )}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(m, e);
                    setPicker(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[19px] transition hover:scale-125 hover:bg-line"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {(counts.length > 0 || m.edited_at || m.failed) && (
          <div className={clsx("mt-1 flex flex-wrap items-center gap-1", mine && "justify-end")}>
            {counts.map((c) => (
              <motion.button
                key={c.emoji}
                layout
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => onReact(m, c.emoji)}
                className={clsx(
                  "flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] transition",
                  c.mine ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-elev text-fg2 hover:border-fg3",
                )}
              >
                <span className="text-[13px]">{c.emoji}</span>
                {c.n}
              </motion.button>
            ))}
            {m.edited_at && !deleted && <span className="px-1 text-[11px] text-fg3">edited</span>}
            {m.failed && <span className="px-1 text-[11px] text-red-500">{m.failed}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
});
