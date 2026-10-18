import { Bell } from "lucide-react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center bg-accent text-white"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      aria-hidden
    >
      <Bell size={size * 0.55} strokeWidth={2.25} />
    </span>
  );
}
