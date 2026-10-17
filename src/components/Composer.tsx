import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowUp, ImagePlus, X } from "lucide-react";
import { useStore } from "../lib/store";

type Props = {
  placeholder: string;
  onSend: (body: string, file: File | null) => void;
  onTyping: () => void;
};

export function Composer({ placeholder, onSend, onTyping }: Props) {
  const { toast } = useStore();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const send = () => {
    if (!body.trim() && !file) return;
    onSend(body.trim(), file);
    setBody("");
    setFile(null);
    area.current?.focus();
  };

  const ready = !!body.trim() || !!file;

  return (
    <div className="px-4 pt-2 pb-4 md:px-6">
      {preview && (
        <div className="relative mb-2 inline-block">
          <img src={preview} alt="" className="h-24 rounded-xl object-cover" />
          <button
            onClick={() => setFile(null)}
            aria-label="Remove image"
            className="absolute -top-2 -right-2 rounded-full bg-fg p-1 text-bg"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <div className="glass flex items-end gap-2 rounded-[26px] border border-line p-1.5 pl-2 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.35)]">
        <button
          onClick={() => picker.current?.click()}
          aria-label="Attach image"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg3 transition hover:bg-line hover:text-fg"
        >
          <ImagePlus size={19} />
        </button>
        <input
          ref={picker}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 5 * 1024 * 1024) return toast("Images up to 5 MB", "error");
            setFile(f);
            e.target.value = "";
          }}
        />
        <textarea
          ref={area}
          rows={1}
          value={body}
          placeholder={placeholder}
          onChange={(e) => {
            setBody(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={4000}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 outline-none placeholder:text-fg3"
        />
        <button
          onClick={send}
          disabled={!ready}
          aria-label="Send"
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            ready ? "scale-100 bg-accent text-white" : "scale-90 bg-line text-fg3",
          )}
        >
          <ArrowUp size={19} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
