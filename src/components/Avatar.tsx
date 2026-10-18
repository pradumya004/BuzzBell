import clsx from "clsx";
import { Bot } from "lucide-react";
import type { Profile } from "../lib/types";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export function Avatar({
  profile,
  size = 36,
  online,
  className,
}: {
  profile?: Profile | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const hue = profile?.avatar_hue ?? 220;
  return (
    <span className={clsx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none"
        style={{
          fontSize: size * 0.38,
          background: `hsl(${hue} 62% 50%)`,
        }}
        aria-hidden
      >
        {profile?.is_bot ? <Bot size={size * 0.55} /> : initials(profile?.display_name ?? "?")}
      </span>
      {online !== undefined && (
        <span
          className={clsx(
            "absolute right-0 bottom-0 rounded-full ring-2 ring-[var(--elev)] transition-colors",
            online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600",
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
          aria-label={online ? "online" : "offline"}
        />
      )}
    </span>
  );
}
