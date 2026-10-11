import { useState } from "react";
import { useWorkspace } from "../store";

export function ShareModal() {
  const { state, dispatch } = useWorkspace();
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${
    typeof window !== "undefined" ? window.location.pathname : ""
  }#workspace/${encodeURIComponent(state.projectName)}`;
  const [copied, setCopied] = useState(false);

  return (
    <div
      data-modal
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="text-[13px] text-white font-medium">Share project</span>
          <button
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
            className="h-6 w-6 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.05] text-[14px]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-2">
              Anyone with the link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md border border-white/[0.08] bg-white/[0.025] text-[11.5px] text-white/85 font-mono truncate">
                {link}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* ignore */
                  }
                }}
                className="px-3 py-2 rounded-md bg-white text-black text-[11px] font-medium hover:bg-white/90 transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Can view", desc: "Read-only access to screens." },
              { label: "Can comment", desc: "View + leave timestamped feedback." },
              { label: "Can edit", desc: "Full access to screens and files." },
            ].map((p, i) => (
              <label
                key={p.label}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-white/[0.05] hover:bg-white/[0.02] cursor-pointer"
              >
                <div>
                  <div className="text-[12px] text-white/85">{p.label}</div>
                  <div className="text-[10.5px] text-white/40">{p.desc}</div>
                </div>
                <input
                  type="radio"
                  name="share-perm"
                  defaultChecked={i === 1}
                  className="accent-white"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}