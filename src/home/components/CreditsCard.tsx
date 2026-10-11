import { motion } from "framer-motion";
import { useHome } from "../store";

export function CreditsCard({ collapsed }: { collapsed?: boolean }) {
  const { state, dispatch } = useHome();
  const { remaining, total } = state.credits;
  const pct = Math.max(0, Math.min(100, total>0?(remaining / total) * 100:0));
  const resetIn = Math.ceil((state.credits.resetAt - Date.now()) / (1000 * 60 * 60 * 24));

  if (collapsed) {
    return (
      <button
        onClick={() =>
          dispatch({ type: "OPEN_MODAL", modal: { type: "credits-billing" } })
        }
        className="w-full flex justify-center"
        title="AI Credits"
      >
        <div className="h-8 w-8 grid place-items-center rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/65">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() =>
        dispatch({ type: "OPEN_MODAL", modal: { type: "credits-billing" } })
      }
      className="w-full text-left rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/[0.1] transition-all p-3"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
          AI Credits
        </span>
        <span className="text-[9.5px] text-white/35 font-mono">
          {state.credits.resetAt>0?`${resetIn}d`:"?"}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-[15px] font-medium text-white tracking-tight">
          {total>0?remaining.toLocaleString():"Not available"}
        </span>
        <span className="text-[10.5px] text-white/35 font-mono">
          {total>0?`/ ${total.toLocaleString()}`:""}
        </span>
      </div>
      <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-gradient-to-r from-white/40 to-white/90 rounded-full"
        />
      </div>
      <div className="mt-2 text-[10px] text-white/30">
        Click to manage usage & billing
      </div>
    </button>
  );
}