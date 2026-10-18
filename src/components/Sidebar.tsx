import clsx from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Check, Copy, Hash, LogOut, Moon, Plus, Search, Sun, X } from "lucide-react";
import { useStore, useTheme } from "../lib/store";
import { formatAgo } from "../lib/format";
import type { InboxRow } from "../lib/types";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
const TIP_KEY = "tip-dismissed";

function readTip() {
  try {
    return localStorage.getItem(TIP_KEY) === "1";
  } catch {
    return false;
  }
}

function LiveTip() {
  const [hidden, setHidden] = useState(readTip);
  const [copied, setCopied] = useState(false);
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      // private mode: the tip just comes back next visit
    }
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(location.origin).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-3 mb-3 rounded-xl border border-line bg-elev p-3 text-[12.5px] leading-snug text-fg2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-fg">See it live with two people</p>
        <button onClick={dismiss} aria-label="Dismiss tip" className="-m-1 rounded-md p-1 text-fg3 hover:text-fg">
          <X size={14} />
        </button>
      </div>
      <p className="mt-1">Open BuzzBell in a private window as a second guest and message yourself. Typing and presence show up live.</p>
      <button onClick={copy} className="mt-2 inline-flex items-center gap-1.5 font-medium text-accent">
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

type Props = {
  activeId: string | null;
  onOpen: (id: string) => void;
  onSearch: () => void;
  onNew: (tab: "channel" | "dm") => void;
};

export function Sidebar({ activeId, onOpen, onSearch, onNew }: Props) {
  const { inbox, me, profiles, online, signOut } = useStore();
  const [theme, toggleTheme] = useTheme();
  const channels = inbox.filter((r) => r.kind === "channel");
  const dms = inbox.filter((r) => r.kind === "dm");

  const item = (row: InboxRow) => {
    const peer = row.peer_id ? profiles.get(row.peer_id) : null;
    const active = row.id === activeId;
    return (
      <li key={row.id}>
        <button
          onClick={() => onOpen(row.id)}
          className={clsx(
            "group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
            active ? "text-fg" : "text-fg2 hover:bg-line/60 hover:text-fg",
          )}
        >
          {active && (
            <motion.span
              layoutId="active-room"
              className="absolute inset-0 rounded-xl bg-elev shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_var(--line)]"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">
            {row.kind === "channel" ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-line text-fg2">
                <Hash size={16} />
              </span>
            ) : (
              <Avatar profile={peer} size={32} online={peer ? peer.is_bot || online.has(peer.id) : undefined} />
            )}
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={clsx("truncate text-[14px]", row.unread > 0 ? "font-semibold text-fg" : "font-medium")}>
                {row.name}
              </span>
              <span className="shrink-0 text-[11px] text-fg3">{formatAgo(row.last_message_at)}</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px] text-fg3">
                {row.last_body ? `${row.kind === "channel" && row.last_author ? `${row.last_author.split(" ")[0]}: ` : ""}${row.last_body}` : row.topic ?? "No messages yet"}
              </span>
              <AnimatePresence>
                {row.unread > 0 && !active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
                  >
                    {row.unread > 99 ? "99+" : row.unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
        </button>
      </li>
    );
  };

  const section = (title: string, rows: InboxRow[], tab: "channel" | "dm") => (
    <div className="mt-5">
      <div className="mb-1 flex items-center justify-between px-2.5">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-fg3 uppercase">{title}</h2>
        <button
          onClick={() => onNew(tab)}
          aria-label={tab === "channel" ? "New channel" : "New message"}
          className="rounded-md p-1 text-fg3 transition hover:bg-line hover:text-fg"
        >
          <Plus size={15} />
        </button>
      </div>
      <ul className="space-y-0.5">
        {rows.map(item)}
      </ul>
    </div>
  );

  return (
    <aside className="glass flex h-full w-full flex-col border-r border-line">
      <div className="flex items-center gap-2 px-4 pt-5 pb-3 text-[17px] font-semibold tracking-tight">
        <Logo size={28} />
        BuzzBell
      </div>
      <div className="px-3">
        <button
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-xl bg-line/70 px-3 text-[13.5px] text-fg3 transition hover:text-fg2"
        >
          <Search size={15} /> Search messages
          <kbd className="ml-auto rounded-md border border-line px-1.5 font-sans text-[11px] pointer-coarse:hidden">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
        {section("Channels", channels, "channel")}
        {section("Direct messages", dms, "dm")}
      </nav>
      <LiveTip />
      <div className="flex items-center gap-3 border-t border-line px-3 py-3">
        <Avatar profile={me} size={34} online />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{me?.display_name}</div>
          <div className="truncate text-[12px] text-fg3">{me?.is_guest ? "Guest" : `@${me?.username}`}</div>
        </div>
        <button onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg p-2 text-fg2 transition hover:bg-line hover:text-fg">
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-fg2 transition hover:bg-line hover:text-fg">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
