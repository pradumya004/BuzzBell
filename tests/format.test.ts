import { describe, expect, it } from "vitest";
import { formatAgo, formatDay, groupMessages } from "../src/lib/format";
import type { Message } from "../src/lib/types";

const msg = (id: number, author: string, at: string): Message => ({
  id,
  conversation_id: "c",
  author_id: author,
  body: `m${id}`,
  attachment_path: null,
  created_at: at,
  edited_at: null,
  deleted_at: null,
});

describe("groupMessages", () => {
  it("groups one author's messages within 5 minutes", () => {
    const rows = groupMessages([
      msg(1, "a", "2026-10-17T10:00:00Z"),
      msg(2, "a", "2026-10-17T10:02:00Z"),
      msg(3, "b", "2026-10-17T10:03:00Z"),
    ]).filter((r) => r.type === "msg");
    expect(rows.map((r) => r.type === "msg" && [r.head, r.tail])).toEqual([
      [true, false],
      [false, true],
      [true, true],
    ]);
  });

  it("starts a new group after a gap", () => {
    const rows = groupMessages([msg(1, "a", "2026-10-17T10:00:00Z"), msg(2, "a", "2026-10-17T10:09:00Z")]);
    expect(rows.filter((r) => r.type === "msg" && r.head)).toHaveLength(2);
  });

  it("adds one day separator per calendar day", () => {
    const rows = groupMessages([
      msg(1, "a", "2026-10-15T10:00:00"),
      msg(2, "a", "2026-10-15T11:00:00"),
      msg(3, "a", "2026-10-16T10:00:00"),
    ]);
    expect(rows.filter((r) => r.type === "day")).toHaveLength(2);
  });
});

describe("formatters", () => {
  it("labels today and yesterday", () => {
    const now = new Date("2026-10-17T12:00:00");
    expect(formatDay("2026-10-17T08:00:00", now)).toBe("Today");
    expect(formatDay("2026-10-16T23:00:00", now)).toBe("Yesterday");
  });

  it("formats relative ages", () => {
    const now = new Date("2026-10-17T12:00:00Z").getTime();
    expect(formatAgo("2026-10-17T11:59:30Z", now)).toBe("now");
    expect(formatAgo("2026-10-17T11:45:00Z", now)).toBe("15m");
    expect(formatAgo("2026-10-17T09:00:00Z", now)).toBe("3h");
    expect(formatAgo("2026-10-14T12:00:00Z", now)).toBe("3d");
  });
});
