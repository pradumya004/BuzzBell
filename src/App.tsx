import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { StoreProvider, useStore, useTheme } from "./lib/store";
import { Landing } from "./components/Landing";
import { Sidebar } from "./components/Sidebar";
import { Room } from "./components/Room";
import { NewChat, SearchPalette, Toasts } from "./components/Overlays";

function Shell() {
  const { session, ready, me, inbox } = useStore();
  useTheme();
  const [activeId, setActiveId] = useState<string | null>(() => location.hash.slice(1) || null);
  const [search, setSearch] = useState(false);
  const [newTab, setNewTab] = useState<"channel" | "dm" | null>(null);

  const open = useCallback((id: string) => {
    setActiveId(id);
    history.replaceState(null, "", `#${id}`);
  }, []);

  // land in #general on first load
  useEffect(() => {
    if (activeId || !inbox.length || window.matchMedia("(max-width: 767px)").matches) return;
    open((inbox.find((r) => r.name === "general") ?? inbox[0]).id);
  }, [inbox, activeId, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || (session && !me)) {
    return (
      <div className="flex h-full items-center justify-center text-fg3">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!session) return <Landing />;

  const room = inbox.find((r) => r.id === activeId);

  return (
    <div className="relative flex h-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-[var(--g2)] opacity-[calc(var(--orb)*0.35)] blur-[140px]" />
        <div className="absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-[var(--g3)] opacity-[calc(var(--orb)*0.3)] blur-[140px]" />
      </div>
      <div className={clsx("relative h-full w-full shrink-0 md:w-[300px]", room && "hidden md:block")}>
        <Sidebar activeId={activeId} onOpen={open} onSearch={() => setSearch(true)} onNew={setNewTab} />
      </div>
      <main className={clsx("relative h-full min-w-0 flex-1", !room && "hidden md:flex")}>
        {room ? (
          <Room key={room.id} room={room} onBack={() => setActiveId(null)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-fg3">Pick a conversation</div>
        )}
      </main>
      <SearchPalette open={search} onClose={() => setSearch(false)} onOpen={open} />
      <NewChat tab={newTab} onClose={() => setNewTab(null)} onOpen={open} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
      <Toasts />
    </StoreProvider>
  );
}
