import type { ProductType } from "../../../shared/product";
import { beginGeneration } from "../../design/api";
import { forwardRef, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useHome } from "../store";

interface PromptBoxProps {
  value: string;
  onChange: (v: string) => void;
}

export const PromptBox = forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ value, onChange }, ref) => {
    const { state } = useHome();
    const [productType, setProductType] = useState<ProductType>("mobile_app");
    const [focused, setFocused] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const submitting = useRef(false);
    const submit = () => {
      if (!value.trim() || state.generating || submitting.current) return;
      submitting.current = true;
      beginGeneration(value, productType);
      window.location.hash = "workspace";
    };

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };

    const handleFiles = (files: FileList | null) => {
      if (!files) return;
      const arr = Array.from(files).filter((f) =>
        ["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(f.type)
      );
      setAttachments((prev) => [...prev, ...arr]);
    };

    return (
      <motion.div
        animate={{ scale: focused ? 1.005 : 1 }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-2xl border bg-white/[0.025] transition-colors ${
          focused
            ? "border-white/[0.18] bg-white/[0.035]"
            : "border-white/[0.08] hover:border-white/[0.12]"
        }`}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder="Describe the website or mobile app you want to build..."
          rows={5}
          className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 px-5 py-4 resize-none focus:outline-none leading-relaxed"
        />

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-white/[0.08] bg-white/[0.025] text-[11px] text-white/75"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="truncate max-w-[140px]">{a.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="text-white/45 hover:text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-0.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <ToolbarButton
              title="Attach file"
              onClick={() => fileRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attach</span>
            </ToolbarButton>
            <div className="flex items-center gap-0.5" role="group" aria-label="Design type">
              {([{type:"website",label:"Web"},{type:"mobile_app",label:"App"}] as const).map(({type,label}) => (
                <button key={type} type="button" aria-pressed={productType===type} onClick={() => setProductType(type)}
                  className={`h-8 px-2.5 rounded-md text-[11.5px] transition-colors ${productType===type ? "bg-white/10 text-white" : "text-white/55 hover:text-white hover:bg-white/[0.04]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-white/30 font-mono hidden sm:inline">
              Enter to send · Shift + Enter for new line
            </span>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={submit}
              disabled={!value.trim() || state.generating}
              className="btn-primary h-8 px-4 text-[12.5px] disabled:opacity-30 flex items-center gap-1.5"
            >
              {state.generating ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                  Generating
                </>
              ) : (
                <>
                  Generate
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
);

PromptBox.displayName = "PromptBox";

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-8 px-2.5 inline-flex items-center gap-1.5 text-[11.5px] text-white/55 hover:text-white hover:bg-white/[0.04] rounded-md transition-colors"
    >
      {children}
    </button>
  );
}
