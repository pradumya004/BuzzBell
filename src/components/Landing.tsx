import { useState, type FormEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowRight, Loader2, Mail } from "lucide-react";

const GitHubMark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";

const ease = [0.16, 1, 0.3, 1] as const;

function Word({ children, delay }: { children: string; delay: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <motion.span
        className="inline-block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

// Each layer moves by depth * pointer offset, so nearer things move more.
function useParallax(depth: number, x: ReturnType<typeof useSpring>, y: ReturnType<typeof useSpring>) {
  return {
    x: useTransform(x, (v) => v * depth),
    y: useTransform(y, (v) => v * depth),
  };
}

const bubbles = [
  { who: "Maya", hue: 330, text: "Webhook retries are live 🎉", depth: 38, top: "6%", left: "4%", me: false },
  { who: "You", hue: 210, text: "Error rate flat since?", depth: 22, top: "30%", left: "34%", me: true },
  { who: "Arjun", hue: 200, text: "Flat. Backoff + idempotency keys.", depth: 52, top: "54%", left: "8%", me: false },
];

export function Landing() {
  const { toast } = useStore();
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 });
  const far = useParallax(-0.6, sx, sy);
  const mid = useParallax(0.35, sx, sy);
  const layers = [useParallax(0.55, sx, sy), useParallax(0.3, sx, sy), useParallax(0.8, sx, sy)];

  const [mode, setMode] = useState<"idle" | "email">("idle");
  const [signup, setSignup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const onPointer = (e: PointerEvent) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 40);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 40);
  };

  const guest = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) toast(error.message, "error");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = signup
      ? await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { display_name: form.name.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setBusy(false);
    if (error) toast(error.message, "error");
  };

  return (
    <main
      onPointerMove={onPointer}
      className="relative flex min-h-full flex-col overflow-hidden bg-bg"
    >
      <motion.div aria-hidden style={far} className="pointer-events-none absolute inset-[-10%]">
        <div className="absolute top-[-10%] right-[-5%] h-[70vh] w-[70vh] rounded-full bg-[var(--g2)] opacity-[calc(var(--orb)*0.55)] blur-[140px]" />
      </motion.div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--g1)] via-[var(--g2)] to-[var(--g3)] text-white">
            ✦
          </span>
          BuzzBell
        </div>
        <a
          href="https://github.com/pradumya004/BuzzBell"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-fg2 transition hover:bg-line hover:text-fg"
        >
          <GitHubMark /> Source
        </a>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[clamp(44px,7vw,84px)] leading-[1.03] font-semibold tracking-[-0.035em]">
            <Word delay={0.1}>Chat</Word> <Word delay={0.18}>that</Word>
            <br />
            <span className="text-fg3">
              <Word delay={0.26}>keeps</Word> <Word delay={0.34}>up.</Word>
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-6 max-w-md text-[19px] leading-relaxed text-fg2"
          >
            Channels, DMs, reactions, presence and typing, live across every tab. Row Level Security decides who
            sees what.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.75 }}
            className="mt-10 max-w-sm"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mode === "idle" ? (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <button
                    onClick={guest}
                    disabled={busy}
                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[16px] font-medium text-white shadow-[0_8px_30px_-8px_var(--accent)] transition active:scale-[0.98] disabled:opacity-70"
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : null}
                    Try it as a guest
                    <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                  </button>
                  <button
                    onClick={() => setMode("email")}
                    className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[16px] font-medium text-accent transition hover:bg-line"
                  >
                    <Mail size={18} /> Use email
                  </button>
                  <p className="w-full pt-1 text-[13px] text-fg3">No signup. Open a second tab to chat with yourself.</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="glass space-y-3 rounded-3xl border border-line p-5"
                >
                  {signup && (
                    <input
                      required
                      maxLength={40}
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-11 w-full rounded-xl border border-line bg-elev px-3.5 text-[15px] outline-none focus:border-accent"
                    />
                  )}
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-11 w-full rounded-xl border border-line bg-elev px-3.5 text-[15px] outline-none focus:border-accent"
                  />
                  <input
                    required
                    type="password"
                    minLength={6}
                    placeholder="Password"
                    autoComplete={signup ? "new-password" : "current-password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-11 w-full rounded-xl border border-line bg-elev px-3.5 text-[15px] outline-none focus:border-accent"
                  />
                  <button
                    disabled={busy}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-medium text-white disabled:opacity-70"
                  >
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {signup ? "Create account" : "Sign in"}
                  </button>
                  <div className="flex justify-between text-[13px] text-fg2">
                    <button type="button" onClick={() => setSignup(!signup)} className="hover:text-fg">
                      {signup ? "Have an account? Sign in" : "New here? Create an account"}
                    </button>
                    <button type="button" onClick={() => setMode("idle")} className="hover:text-fg">
                      Back
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.div
          aria-hidden
          style={mid}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease, delay: 0.3 }}
          className="relative hidden h-[440px] lg:block"
        >
          {bubbles.map((b, i) => (
            <motion.div
              key={b.who}
              style={{ ...layers[i], top: b.top, left: b.left }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease, delay: 0.6 + i * 0.18 }}
              className="absolute"
            >
              <div
                className={`glass flex max-w-[300px] items-end gap-3 rounded-[22px] border border-line p-3 pr-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] ${b.me ? "flex-row-reverse" : ""}`}
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ background: `linear-gradient(135deg, hsl(${b.hue} 80% 62%), hsl(${b.hue + 40} 75% 48%))` }}
                />
                <div className={b.me ? "text-right" : ""}>
                  <div className="text-[12px] font-medium text-fg2">{b.who}</div>
                  <div
                    className={`mt-1 rounded-2xl px-3.5 py-2 text-[15px] ${b.me ? "bg-me text-white" : "bg-elev"}`}
                  >
                    {b.text}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          <motion.div
            style={{ ...layers[1], top: "78%", left: "40%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="glass absolute flex items-center gap-1.5 rounded-full border border-line px-4 py-3"
          >
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="h-2 w-2 rounded-full bg-fg3"
                animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
              />
            ))}
          </motion.div>
        </motion.div>
      </section>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-6 text-[13px] text-fg3">
        Built by{" "}
        <a href="https://github.com/pradumya004" className="text-fg2 hover:text-fg">
          Pradumya Gaurav
        </a>
        . React, TypeScript, Supabase.
      </footer>
    </main>
  );
}
