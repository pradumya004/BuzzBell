import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { InboxRow, Message, Profile, Reaction } from "./types";

type Listener<T> = (payload: RealtimePostgresChangesPayload<T & Record<string, unknown>>) => void;
type Toast = { id: number; text: string; tone: "info" | "error" };

type Store = {
  session: Session | null;
  me: Profile | null;
  ready: boolean;
  profiles: Map<string, Profile>;
  ensureProfiles: (ids: string[]) => void;
  inbox: InboxRow[];
  refreshInbox: () => void;
  online: Set<string>;
  onMessage: (fn: Listener<Message>) => () => void;
  onReaction: (fn: Listener<Reaction>) => () => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const messageListeners = useRef(new Set<Listener<Message>>());
  const reactionListeners = useRef(new Set<Listener<Reaction>>());
  const requested = useRef(new Set<string>());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const mergeProfiles = useCallback((rows: Profile[]) => {
    setProfiles((prev) => {
      const next = new Map(prev);
      rows.forEach((p) => next.set(p.id, p));
      return next;
    });
  }, []);

  const ensureProfiles = useCallback(
    (ids: string[]) => {
      const missing = ids.filter((id) => id && !requested.current.has(id));
      if (!missing.length) return;
      missing.forEach((id) => requested.current.add(id));
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_hue, is_guest, is_bot")
        .in("id", missing)
        .then(({ data }) => data && mergeProfiles(data));
    },
    [mergeProfiles],
  );

  const refreshTimer = useRef<number | undefined>(undefined);
  const refreshInbox = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("inbox");
      if (error) return;
      setInbox(data as InboxRow[]);
      ensureProfiles((data as InboxRow[]).map((r) => r.peer_id).filter(Boolean) as string[]);
    }, 120);
  }, [ensureProfiles]);

  const userId = session?.user.id;

  // Profiles are tiny for a demo, so load them all once per session.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_hue, is_guest, is_bot")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!data) return;
        data.forEach((p) => requested.current.add(p.id));
        mergeProfiles(data);
      });
    refreshInbox();
  }, [userId, mergeProfiles, refreshInbox]);

  // One realtime channel for every row this user may see (RLS filters server-side).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("db")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        messageListeners.current.forEach((fn) => fn(payload as never));
        refreshInbox();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => {
        reactionListeners.current.forEach((fn) => fn(payload as never));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshInbox]);

  // Presence: who has BuzzBell open right now.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("online", { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const onMessage = useCallback((fn: Listener<Message>) => {
    messageListeners.current.add(fn);
    return () => void messageListeners.current.delete(fn);
  }, []);

  const onReaction = useCallback((fn: Listener<Reaction>) => {
    reactionListeners.current.add(fn);
    return () => void reactionListeners.current.delete(fn);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setInbox([]);
    setProfiles(new Map());
    requested.current.clear();
  }, []);

  const me = (userId && profiles.get(userId)) || null;

  const value = useMemo<Store>(
    () => ({ session, me, ready, profiles, ensureProfiles, inbox, refreshInbox, online, onMessage, onReaction, toasts, toast, signOut }),
    [session, me, ready, profiles, ensureProfiles, inbox, refreshInbox, online, onMessage, onReaction, toasts, toast, signOut],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* storage unavailable */
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))] as const;
}
