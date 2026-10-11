import {useAuth} from "../../auth/AuthProvider";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useHome } from "../store";
import type { SettingsSection } from "../types";

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  {
    id: "account",
    label: "Account",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    id: "ai",
    label: "AI Preferences",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Billing",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    ),
  },
];

export function SettingsModal() {
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "settings") return null;
  const [section, setSection] = useState<SettingsSection>(modal.section ?? "account");

  useEffect(() => {
    if (modal.type === "settings" && modal.section) {
      setSection(modal.section);
    }
  }, [modal.type === "settings" ? modal.section : null]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE_MODAL" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <motion.div
      data-modal
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[820px] h-[560px] rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl overflow-hidden grid grid-cols-[200px_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="border-r border-white/[0.06] p-3 flex flex-col">
          <div className="px-2 pb-3 mb-1 border-b border-white/[0.04]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
              Settings
            </div>
          </div>
          <div className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] transition-colors ${
                  section === s.id
                    ? "bg-white/[0.06] text-white"
                    : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span className={section === s.id ? "text-white" : "text-white/45"}>
                  {s.icon}
                </span>
                <span className="font-medium">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-auto pt-3 border-t border-white/[0.04]">
            <button
              onClick={() => dispatch({ type: "CLOSE_MODAL" })}
              className="w-full h-7 rounded-md text-[12px] text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto ws-scrollbar">
          <div className="px-8 py-6">
            {section === "account" && <AccountSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "ai" && <AIPreferencesSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "billing" && <BillingSection />}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AccountSection() {
  const {user}=useAuth();
  const { state, dispatch } = useHome();
  const { settings } = state;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] text-white font-medium tracking-tight">Account</h3>
        <p className="text-[12px] text-white/45 mt-1">
          Manage your profile and authentication.
        </p>
      </div>
      <Row label="Display name">
        <input
          value={user?.displayName??settings.displayName}
          readOnly={!!user}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", partial: { displayName: e.target.value } })
          }
          className="ws-input w-full px-3 py-2 text-[12.5px]"
        />
      </Row>
      <Row label="Email">
        <input
          value={user?.email??settings.email}
          readOnly={!!user}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", partial: { email: e.target.value } })
          }
          className="ws-input w-full px-3 py-2 text-[12.5px]"
        />
      </Row>
      <Row label="Plan"><div className="text-[12.5px] text-white/45">Not available</div></Row>
    </div>
  );
}

function AppearanceSection() {
  const { state, dispatch } = useHome();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] text-white font-medium tracking-tight">Appearance</h3>
        <p className="text-[12px] text-white/45 mt-1">
          Customize how FRAME looks for you.
        </p>
      </div>
      <Row label="Theme">
        <div className="grid grid-cols-1 gap-2">
          <ThemeSwatch
            name="Dark"
            desc="Premium cinematic surface."
            selected
          />
        </div>
      </Row>
      <Row label="Accent">
        <div className="flex gap-2">
          {[
            { id: "white", color: "#FFFFFF", name: "White" },
            { id: "sky", color: "#7AA2FF", name: "Sky" },
            { id: "mint", color: "#9ED7C0", name: "Mint" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  partial: { accent: opt.id as "white" | "sky" | "mint" },
                })
              }
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                state.settings.accent === opt.id
                  ? "border-white/[0.18] bg-white/[0.05]"
                  : "border-white/[0.06] hover:bg-white/[0.02]"
              }`}
            >
              <div
                className="h-3 w-9 rounded-sm border border-white/[0.1]"
                style={{ background: opt.color }}
              />
              <span className="text-[12px] text-white/85">{opt.name}</span>
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function AIPreferencesSection() {
  const { state, dispatch } = useHome();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] text-white font-medium tracking-tight">AI Preferences</h3>
        <p className="text-[12px] text-white/45 mt-1">
          Tune how FRAME's AI works.
        </p>
      </div>
      <Row label="Model"><div className="rounded-md border border-white/[0.06] px-3 py-2 text-[12.5px] text-white/65">Gemini ? configured on the server</div></Row>
      <Row label="Tone">
        <SegmentedControl
          value={state.settings.aiTone}
          options={[
            { id: "concise", label: "Concise" },
            { id: "balanced", label: "Balanced" },
            { id: "detailed", label: "Detailed" },
          ]}
          onChange={(v) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              partial: { aiTone: v as "concise" | "balanced" | "detailed" },
            })
          }
        />
      </Row>
    </div>
  );
}

function NotificationsSection() {
  const { state, dispatch } = useHome();
  const n = state.settings.notifications;
  const items = [
    { key: "projectUpdates" as const, label: "Project updates", desc: "When AI finishes generating." },
    { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Summary of your projects." },
    { key: "newFeatures" as const, label: "New features", desc: "Be the first to try new tools." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] text-white font-medium tracking-tight">Notifications</h3>
        <p className="text-[12px] text-white/45 mt-1">
          Choose what you want to hear about.
        </p>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-md border border-white/[0.06] px-3 py-2.5"
          >
            <div>
              <div className="text-[12.5px] text-white">{item.label}</div>
              <div className="text-[11px] text-white/45">{item.desc}</div>
            </div>
            <button
              onClick={() =>
                dispatch({
                  type: "UPDATE_NOTIFICATIONS",
                  partial: { [item.key]: !n[item.key] },
                })
              }
              className={`ws-toggle ${n[item.key] ? "is-on" : ""}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection() {
  const { state } = useHome();
  const c = state.credits;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] text-white font-medium tracking-tight">Billing</h3>
        <p className="text-[12px] text-white/45 mt-1">
          Manage your subscription and credits.
        </p>
      </div>
      <Row label="Current plan"><div className="text-[12.5px] text-white/45">Not available</div></Row>
      <Row label="AI credits">
        <div className="text-[12.5px] text-white/85">
          {c.total>0?`${c.remaining.toLocaleString()} / ${c.total.toLocaleString()} remaining`:"Not available"}
        </div>
      </Row>
      <Row label="Reset">
        <div className="text-[12.5px] text-white/85">
          {c.resetAt>0?`${Math.ceil((c.resetAt - Date.now()) / (1000 * 60 * 60 * 24))} days`:"Not scheduled"}
        </div>
      </Row>
      <div className="pt-2">
        <button className="btn-primary px-4 py-2 text-[12px]">
          Upgrade plan
        </button>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
      <div className="text-[12px] text-white/55 pt-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center bg-white/[0.025] border border-white/[0.06] rounded-md p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 px-3 py-1 text-[11.5px] rounded transition-all ${
            value === o.id ? "bg-white text-black" : "text-white/55 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ThemeSwatch({
  name,
  desc,
  selected,
}: {
  name: string;
  desc: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all ${
        selected ? "border-white/[0.18] bg-white/[0.04]" : "border-white/[0.06]"
      }`}
    >
      <div
        className="h-8 w-14 rounded-md border border-white/[0.08]"
        style={{ background: "linear-gradient(180deg, #0A0A0D 0%, #050507 100%)" }}
      />
      <div className="flex-1">
        <div className="text-[12.5px] text-white font-medium">{name}</div>
        <div className="text-[11px] text-white/45">{desc}</div>
      </div>
      {selected && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/85">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}