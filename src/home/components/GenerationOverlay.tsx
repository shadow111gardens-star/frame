import { motion } from "framer-motion";
import { useHome } from "../store";

export function GenerationOverlay() {
  const { state } = useHome();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-30 bg-[#050507]/85 backdrop-blur-sm grid place-items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-[420px] max-w-[90vw] rounded-2xl border border-white/[0.08] bg-[#0A0A0D] p-8 text-center shadow-2xl"
      >
        {/* Animated orb */}
        <div className="relative mx-auto mb-6 w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.8), rgba(255,255,255,0.1))",
              mask: "radial-gradient(circle, transparent 50%, black 51%)",
              WebkitMask: "radial-gradient(circle, transparent 50%, black 51%)",
            }}
          />
          <div className="absolute inset-2 rounded-full bg-black" />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-3 rounded-full bg-gradient-to-br from-white/15 to-white/[0.04]"
          />
          <div
            className="absolute -inset-4 rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </div>

        <div className="text-[14px] text-white/85 font-medium tracking-tight mb-1">
          Creating your app
        </div>
        <div className="text-[12px] text-white/40 mb-6">
          FRAME is generating your editable screens.
        </div>

        {/* Steps */}
        <div className="space-y-2 text-left">
          {state.generationSteps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all ${
                step.status === "active"
                  ? "border-white/[0.12] bg-white/[0.04]"
                  : step.status === "done"
                  ? "border-white/[0.06] bg-white/[0.015]"
                  : "border-transparent"
              }`}
            >
              {step.status === "done" ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-400/80 flex-shrink-0"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : step.status === "active" ? (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full bg-white flex-shrink-0"
                />
              ) : (
                <span className="h-2 w-2 rounded-full bg-white/20 flex-shrink-0" />
              )}
              <span
                className={`text-[12px] ${
                  step.status === "active"
                    ? "text-white"
                    : step.status === "done"
                    ? "text-white/45 line-through"
                    : "text-white/30"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Appllama tag */}
        <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-center justify-center gap-2 text-[10.5px] text-white/30 font-mono">
          <span className="h-1 w-1 rounded-full bg-white/30" />
          Powered by Frame AI · Appllama MCP
        </div>
      </motion.div>
    </motion.div>
  );
}