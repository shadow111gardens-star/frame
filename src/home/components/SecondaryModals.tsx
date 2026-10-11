import { motion } from "framer-motion";
import { useHome } from "../store";

const TEMPLATES = [
  { name: "E-Commerce", desc: "Product catalog, cart, checkout.", icon: "🛒" },
  { name: "Finance", desc: "Budgets, transactions, charts.", icon: "◇" },
  { name: "Travel", desc: "Itinerary, maps, bookings.", icon: "✈" },
  { name: "Wellness", desc: "Meditation, habits, streaks.", icon: "○" },
  { name: "Social", desc: "Profiles, feed, messages.", icon: "◇" },
  { name: "Productivity", desc: "Tasks, notes, calendar.", icon: "□" },
];

export function TemplatesModal() {
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "templates") return null;
  return (
    <StandardModal
      title="Start from a template"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <p className="text-[12px] text-white/45 mb-4">
        Pick a starting point — FRAME will adapt it to your idea.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => {
              dispatch({ type: "SET_PROMPT", value: `Create a ${t.name.toLowerCase()} app. ${t.desc}` });
              dispatch({ type: "CLOSE_MODAL" });
            }}
            className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-left"
          >
            <div className="h-7 w-7 rounded-md bg-white/[0.04] border border-white/[0.06] grid place-items-center text-[12px] text-white/85">
              {t.icon}
            </div>
            <div className="text-[12.5px] text-white font-medium">{t.name}</div>
            <div className="text-[10.5px] text-white/45 leading-snug">{t.desc}</div>
          </button>
        ))}
      </div>
    </StandardModal>
  );
}

export function ImportModal() {
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "import") return null;
  return (
    <StandardModal
      title="Import a design"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <p className="text-[12px] text-white/45 mb-4">
        Drop a Figma file, screenshot, or design reference. FRAME will turn it
        into editable components.
      </p>
      <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-10 text-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-white/45 mx-auto mb-3">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <div className="text-[13px] text-white/85 font-medium">
          Drop your file here
        </div>
        <div className="text-[11px] text-white/40 mt-1">
          PNG · JPG · WEBP · PDF · Figma (.fig)
        </div>
      </div>
    </StandardModal>
  );
}

export function CreditsBillingModal() {
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "credits-billing") return null;
  const c = state.credits;
  return (
    <StandardModal
      title="AI Credits"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      width="max-w-[520px]"
    >
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[28px] font-medium text-white tracking-tight">
          {c.total>0?c.remaining.toLocaleString():"Not available"}
        </span>
        <span className="text-[14px] text-white/40 font-mono">
          {c.total>0?`/ ${c.total.toLocaleString()} credits`:""}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-white/40 to-white/90 rounded-full"
          style={{ width: `${c.total>0?(c.remaining / c.total) * 100:0}%` }}
        />
      </div>

      <div className="text-[11px] uppercase tracking-widest text-white/35 font-mono mb-2">
        Recent usage
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto ws-scrollbar">
        {c.history.length===0 && <div className="text-[12px] text-white/40">No usage recorded.</div>}
        {c.history.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 text-[12px]"
          >
            <span className="text-white/85 truncate">{h.label}</span>
            <span className="text-white/55 font-mono">{h.amount}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          className="btn-ghost px-4 py-2 text-[12px]"
        >
          Close
        </button>
        <button className="btn-primary px-4 py-2 text-[12px]">
          Upgrade plan
        </button>
      </div>
    </StandardModal>
  );
}

function StandardModal({
  children,
  title,
  onClose,
  width = "max-w-[480px]",
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  width?: string;
}) {
  return (
    <motion.div
      data-modal
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full ${width} rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="text-[13px] text-white font-medium">{title}</span>
          <button
            onClick={onClose}
            className="h-6 w-6 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.05] text-[14px]"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}