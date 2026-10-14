import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHome } from "../store";
import { PromptBox } from "./PromptBox";
import { GenerationOverlay } from "./GenerationOverlay";

const EXAMPLES = [
  "Fitness tracking app",
  "Personal finance app",
  "Travel planner",
  "Social networking app",
  "Habit tracker",
  "Food delivery",
];

const QUICK_ACTIONS = [
  {
    id: "idea",
    label: "Create from idea",
    desc: "Describe what you want to build",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "template",
    label: "Start from template",
    desc: "Pre-built layouts for common apps",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: "import",
    label: "Import design",
    desc: "Figma, Sketch, screenshots",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    ),
  },
];

export function CenterStage() {
  const { state, dispatch } = useHome();
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const focusPrompt = () => {
    setTimeout(() => promptRef.current?.focus(), 50);
  };

  const setExample = (text: string) => {
    dispatch({ type: "SET_PROMPT", value: text });
    focusPrompt();
  };

  const handleQuickAction = (id: string) => {
    if (id === "idea") {
      focusPrompt();
    } else if (id === "template") {
      dispatch({ type: "OPEN_MODAL", modal: { type: "templates" } });
    } else if (id === "import") {
      dispatch({ type: "OPEN_MODAL", modal: { type: "import" } });
    }
  };

  return (
    <main className="relative flex-1 flex flex-col bg-[#050507] overflow-hidden">
      {/* Atmospheric lighting */}
      <BackgroundAtmosphere />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto ws-scrollbar">
        <div className="w-full max-w-[820px] flex flex-col items-center">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <h1 className="font-sans font-medium tracking-[-0.04em] text-silver-shine text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.02]">
              <span className="block">Turn your idea</span>
              <span className="block italic font-serif font-light">into an app.</span>
            </h1>
            <p className="mt-5 text-[14.5px] sm:text-[15px] text-white/50 max-w-lg mx-auto leading-relaxed">
              Describe the website or mobile app you want to build. FRAME designs the first
              version — screens, components, and editable UI — ready to build.
            </p>
          </motion.div>

          {/* Prompt box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full mt-10"
          >
            <PromptBox
              ref={promptRef}
              value={state.prompt}
              onChange={(v) => dispatch({ type: "SET_PROMPT", value: v })}
            />
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 w-full"
          >
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleQuickAction(a.id)}
                className="flex flex-col items-start gap-1 px-3.5 py-3 rounded-lg border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.035] hover:border-white/[0.1] transition-all text-left group"
              >
                <div className="text-white/55 group-hover:text-white transition-colors">
                  {a.icon}
                </div>
                <div className="text-[12.5px] text-white font-medium">{a.label}</div>
                <div className="text-[10.5px] text-white/40 leading-snug">{a.desc}</div>
              </button>
            ))}
          </motion.div>

          {/* Examples */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
          >
            <span className="text-[11px] text-white/35 mr-2 font-mono">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setExample(ex)}
                className="ws-chip"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Generation overlay */}
      <AnimatePresence>{state.generating && <GenerationOverlay />}</AnimatePresence>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Subtle FRAME visual
// ─────────────────────────────────────────────────────────

function BackgroundAtmosphere() {
  return (
    <>
      {/* Soft glow at top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] -z-10 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(106,138,255,0.12) 0%, rgba(80,100,180,0.04) 30%, transparent 65%)",
          filter: "blur(80px)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* Subtle grid */}
      <div className="absolute inset-0 ws-dot-bg opacity-30 -z-10 pointer-events-none" />
      {/* Grain */}
      <div className="absolute inset-0 grain opacity-[0.02] -z-10 pointer-events-none" />
    </>
  );
}