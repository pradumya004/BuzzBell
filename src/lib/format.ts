import type { Message } from "./types";

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

export const formatTime = (iso: string) => time.format(new Date(iso));

export function formatDay(iso: string, now = new Date()) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.format(d);
}

export function formatAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

export type Row =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; message: Message; head: boolean; tail: boolean };

// Day separators, plus head/tail flags so consecutive messages from one
// author within 5 minutes render as a single group.
export function groupMessages(messages: Message[], gapMs = 5 * 60_000): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  messages.forEach((m, i) => {
    const label = formatDay(m.created_at);
    if (label !== lastDay) {
      rows.push({ type: "day", key: `d-${m.created_at}`, label });
      lastDay = label;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const near = (a?: Message, b?: Message) =>
      !!a && !!b && a.author_id === b.author_id &&
      Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < gapMs &&
      formatDay(a.created_at) === formatDay(b.created_at);
    rows.push({
      type: "msg",
      key: m.tempId ?? String(m.id),
      message: m,
      head: !near(prev, m),
      tail: !near(m, next),
    });
  });
  return rows;
}
