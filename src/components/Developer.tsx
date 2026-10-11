import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const files = {
  screens: [
    { name: "Home.tsx", lines: 142, lang: "tsx" },
    { name: "Profile.tsx", lines: 98, lang: "tsx" },
    { name: "Settings.tsx", lines: 116, lang: "tsx" },
  ],
  components: [
    { name: "Button.tsx", lines: 56, lang: "tsx" },
    { name: "Card.tsx", lines: 74, lang: "tsx" },
    { name: "Header.tsx", lines: 88, lang: "tsx" },
  ],
};

export function Developer() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
          className="max-w-3xl mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11.5px] uppercase tracking-[0.2em] text-white/40">
              Developer-first
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-medium tracking-[-0.03em] text-silver-shine text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            Designed visually.
            <br />
            <span className="italic font-serif font-light">Built for developers.</span>
          </h2>
          <p className="mt-6 text-[15px] sm:text-[16px] text-white/50 max-w-xl">
            Export production-ready code. Clean TypeScript, accessible markup, and a
            project structure you'd write yourself.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease }}
          className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6"
        >
          {/* Files browser */}
          <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-[11px] text-white/40 font-mono">~/frame · main</span>
              <div className="text-[10px] text-white/30 font-mono">● 3 commits</div>
            </div>

            <div className="p-6">
              {/* Folder structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-widest text-white/40 font-mono">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                    screens/
                  </div>
                  <div className="space-y-1.5">
                    {files.screens.map((f, i) => (
                      <motion.div
                        key={f.name}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08, ease }}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 hover:bg-white/[0.025] hover:border-white/[0.1] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span className="text-[13px] text-white/85 font-mono">{f.name}</span>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">{f.lines} lines</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-widest text-white/40 font-mono">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                    components/
                  </div>
                  <div className="space-y-1.5">
                    {files.components.map((f, i) => (
                      <motion.div
                        key={f.name}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.08, ease }}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 hover:bg-white/[0.025] hover:border-white/[0.1] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span className="text-[13px] text-white/85 font-mono">{f.name}</span>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">{f.lines} lines</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code preview */}
              <div className="mt-8 rounded-xl border border-white/[0.06] bg-black/40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm bg-emerald-400/60" />
                    <span className="text-[11px] text-white/70 font-mono">Home.tsx</span>
                  </div>
                  <span className="text-[10px] text-white/30 font-mono">TypeScript</span>
                </div>
                <pre className="p-4 text-[11.5px] font-mono leading-[1.7] overflow-x-auto">
<code className="text-[11.5px] font-mono leading-[1.7] overflow-x-auto">{`<span class="text-white/30">import</span> { <span class="text-white">View</span>, <span class="text-white">Text</span> } <span class="text-white/30">from</span> <span class="text-emerald-300/70">"react-native"</span>;
<span class="text-white/30">import</span> { <span class="text-white">Header</span>, <span class="text-white">Button</span> } <span class="text-white/30">from</span> <span class="text-emerald-300/70">"@/components"</span>;

<span class="text-white/30">export default function</span> <span class="text-sky-300/80">Home</span>() {
  <span class="text-white/30">return</span> (
    &lt;<span class="text-sky-300/80">View</span> <span class="text-white/50">style</span>={styles.container}&gt;
      &lt;<span class="text-sky-300/80">Header</span> <span class="text-white/50">title</span>=<span class="text-amber-200/70">"Workout"</span> /&gt;
      &lt;<span class="text-sky-300/80">Text</span>&gt;Today&apos;s training&lt;/&gt;
      &lt;<span class="text-sky-300/80">Button</span> <span class="text-white/50">label</span>=<span class="text-amber-200/70">"Start"</span> /&gt;
    &lt;/<span class="text-sky-300/80">View</span>&gt;
  );
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Right: Tech stack + CTA */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-7">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-4">
                Tech Stack
              </div>
              <div className="space-y-3">
                {[
                  { name: "React Native", desc: "Cross-platform native" },
                  { name: "Expo", desc: "Zero-config tooling" },
                  { name: "TypeScript", desc: "Strict, type-safe" },
                ].map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, ease }}
                    className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0"
                  >
                    <div>
                      <div className="text-[14px] text-white font-medium">{tech.name}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">{tech.desc}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-7 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-3">
                  Export
                </div>
                <div className="text-[16px] text-white/85">
                  Push to GitHub, sync with your repo, or download a ZIP.
                </div>
              </div>
              <a
                href="#"
                className="btn-primary mt-6 px-5 py-3 text-[14px] inline-flex items-center justify-center gap-2"
              >
                Build your first screen
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}