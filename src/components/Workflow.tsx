import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const chatSteps = [
  {
    role: "user",
    text: "Create a modern fitness tracking app for beginners.",
    delay: 0,
  },
  {
    role: "ai",
    text: "Understanding your idea...",
    delay: 1.2,
  },
  {
    role: "ai",
    text: "Researching relevant mobile patterns...",
    delay: 2.4,
  },
  {
    role: "ai",
    text: "Creating your app structure...",
    delay: 3.6,
  },
];

export function Workflow() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((c) => {
        const next = c + 1;
        if (next > chatSteps.length) {
          setTimeout(() => {
            setVisibleCount(0);
            setProgress(0);
          }, 1500);
          return c;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 2));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="workflow" className="relative py-32 overflow-hidden">
      {/* subtle background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(106,138,255,0.12) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11.5px] uppercase tracking-[0.2em] text-white/40">
              The Workflow
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-medium tracking-[-0.03em] text-silver-shine text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            From idea to interface.
          </h2>
          <p className="mt-6 text-[15px] sm:text-[16px] text-white/50 max-w-xl mx-auto">
            A focused editor that turns conversation into production-ready mobile UI.
          </p>
        </motion.div>

        {/* Editor Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease }}
          className="relative"
        >
          {/* Frame */}
          <div className="relative rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.02] to-white/[0.005] backdrop-blur-xl overflow-hidden">
            {/* Editor chrome bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/40 font-mono">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
                frame.studio / editor / fitness-app
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
                <span className="text-[11px] text-white/40 font-mono">Live</span>
              </div>
            </div>

            {/* Editor body */}
            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-[640px]">
              {/* Left: Chat panel */}
              <div className="border-r border-white/[0.06] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-gradient-to-br from-white/20 to-white/5 border border-white/10 grid place-items-center">
                      <div className="w-2 h-2 rounded-sm bg-white" />
                    </div>
                    <span className="text-[13px] text-white/80 font-medium">Conversation</span>
                  </div>
                  <span className="text-[10px] text-white/30 font-mono">FRAME AI</span>
                </div>

                <div className="flex-1 space-y-4 overflow-hidden">
                  {chatSteps.slice(0, visibleCount).map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease }}
                      className={`flex ${
                        step.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                          step.role === "user"
                            ? "bg-white text-black"
                            : "bg-white/[0.04] border border-white/[0.06] text-white/85"
                        }`}
                      >
                        {step.role === "ai" && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40">
                              Frame AI
                            </span>
                          </div>
                        )}
                        <span className={step.role === "ai" && i === visibleCount - 1 ? "cursor-blink" : ""}>
                          {step.text}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {visibleCount >= chatSteps.length && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-[11px] text-white/40 font-mono"
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-50 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      Generating 6 screens · {Math.floor((progress / 100) * 6)}/6
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center gap-2">
                  <div className="flex-1 text-[12.5px] text-white/40 truncate">
                    Refine your app idea...
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white grid place-items-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="relative bg-gradient-to-b from-white/[0.01] to-transparent p-8 lg:p-12 flex items-center justify-center">
                {/* Subtle grid backdrop */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />

                <div className="relative">
                  {/* Progress bar above */}
                  <div className="absolute -top-8 left-0 right-0 flex items-center justify-between text-[10px] font-mono text-white/40 mb-2">
                    <span>Generating</span>
                    <span>{Math.min(progress, 100)}%</span>
                  </div>
                  <div className="absolute -top-4 left-0 right-0 h-px bg-white/[0.06] overflow-hidden rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-white/30 to-white/80 transition-all duration-100"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  {/* iPhone Preview */}
                  <div className="phone-frame w-[260px] h-[540px] lg:w-[300px] lg:h-[620px] mx-auto relative">
                    <div
                      className="absolute -inset-10 -z-10 opacity-50"
                      style={{
                        background:
                          "radial-gradient(ellipse at center, rgba(106,138,255,0.18) 0%, transparent 60%)",
                        filter: "blur(40px)",
                      }}
                    />
                    <div className="phone-screen">
                      <div className="notch" />
                      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c12] to-[#06060a] pt-14 px-5">
                        {/* Fitness app preview */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-[9px] text-white/40">Today</div>
                            <div className="text-[16px] text-white font-medium tracking-tight">Workout</div>
                          </div>
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10" />
                        </div>

                        {/* Big stat */}
                        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-transparent p-4 mb-3 relative overflow-hidden">
                          <div
                            className="absolute -top-10 -right-10 w-32 h-32 opacity-30"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(180,200,255,0.6) 0%, transparent 70%)",
                              filter: "blur(20px)",
                            }}
                          />
                          <div className="relative">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[28px] font-light text-white tracking-tight">8.4</span>
                              <span className="text-[10px] text-white/40">km</span>
                            </div>
                            <div className="text-[9px] text-white/50 mt-0.5">Morning run · 42 min</div>
                            <div className="mt-3 flex items-end gap-[3px] h-12">
                              {[30, 45, 38, 55, 42, 65, 50, 78, 60, 85, 70, 92].map((h, i) => (
                                <div
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className="flex-1 rounded-sm bg-gradient-to-t from-white/15 to-white/60"
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Goals */}
                        <div className="text-[10px] text-white/50 mb-2">Daily goals</div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[
                            { l: "Move", v: "85%" },
                            { l: "Steps", v: "9.2k" },
                            { l: "Stand", v: "12h" },
                          ].map((s) => (
                            <div key={s.l} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-center">
                              <div className="text-[10px] text-white font-medium">{s.v}</div>
                              <div className="text-[7.5px] text-white/40 mt-0.5">{s.l}</div>
                            </div>
                          ))}
                        </div>

                        {/* Action button */}
                        <button className="w-full rounded-full bg-white text-black text-[12px] font-medium py-2.5 mb-2">
                          Start workout
                        </button>

                        {/* Bottom tab bar */}
                        <div className="absolute bottom-3 left-0 right-0 px-5">
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md flex justify-around py-2 px-2">
                            {["Home", "Stats", "Plan", "Profile"].map((t, i) => (
                              <div
                                key={t}
                                className={`text-[8.5px] ${i === 0 ? "text-white" : "text-white/40"}`}
                              >
                                {t}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating components around phone */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -left-8 top-12 lg:-left-24 lg:top-20 rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-md p-3 w-44 hidden md:block"
                  >
                    <div className="text-[9px] text-white/40 mb-1 font-mono uppercase tracking-widest">
                      Component
                    </div>
                    <div className="text-[12px] text-white font-medium">WorkoutCard</div>
                    <div className="text-[10px] text-white/40 mt-1">12 variants</div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -right-8 bottom-32 lg:-right-20 lg:bottom-36 rounded-xl border border-white/[0.08] bg-black/60 backdrop-blur-md p-3 w-40 hidden md:block"
                  >
                    <div className="text-[9px] text-white/40 mb-1 font-mono uppercase tracking-widest">
                      Token
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-white" />
                      <span className="text-[11px] text-white font-mono">#FFFFFF</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">Primary · 100%</div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom annotation */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-white/40 font-mono uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Chat
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Research
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Design
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/60" />
              Editable UI
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}