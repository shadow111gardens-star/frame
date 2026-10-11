import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    num: "01",
    title: "Describe",
    headline: "Explain your idea.",
    description:
      "User describes their app in natural language. Frame understands context, audience, and intent from a single prompt.",
    visual: <DescribeVisual />,
  },
  {
    num: "02",
    title: "Design",
    headline: "AI builds the interface.",
    description:
      "Frame researches relevant mobile patterns from thousands of high-end products, then creates a complete screen system.",
    visual: <DesignVisual />,
  },
  {
    num: "03",
    title: "Edit",
    headline: "Make it yours.",
    description:
      "Every generated screen and component is editable. Adjust typography, color, spacing, and layout with precision.",
    visual: <EditVisual />,
  },
];

function DescribeVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.025] to-white/[0.005] p-5 h-full">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-4 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
        Prompt
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 mb-3">
        <div className="text-[11.5px] text-white/85 font-light cursor-blink">
          A minimalist meditation app for stressed professionals. Calming colors, gentle motion, daily 5-minute sessions.
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Meditation", "Wellness", "iOS Native", "Premium"].map((t) => (
          <span
            key={t}
            className="px-2.5 py-1 rounded-full text-[10px] border border-white/[0.08] bg-white/[0.02] text-white/60"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] text-white/40 font-mono">
        <span>Context understood</span>
        <span className="text-white/70">4 intents · 3 patterns</span>
      </div>
    </div>
  );
}

function DesignVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.025] to-white/[0.005] p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
          Generating
        </div>
        <span className="text-[10px] text-white/40 font-mono">6 screens</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className="aspect-[9/16] rounded-lg border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-1.5 relative overflow-hidden"
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-6 bg-black rounded-full" />
            {i === 1 && (
              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-2/3 bg-white/30 rounded" />
                <div className="h-3 w-full bg-white/15 rounded mt-1.5" />
                <div className="h-3 w-full bg-white/15 rounded" />
                <div className="h-3 w-3/4 bg-white/15 rounded" />
              </div>
            )}
            {i === 2 && (
              <div className="mt-3">
                <div className="h-6 w-full rounded-full border border-white/15 bg-white/10" />
                <div className="mt-2 grid grid-cols-3 gap-0.5">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <div key={j} className="aspect-square rounded bg-white/8" />
                    ))}
                  </div>
              </div>
            )}
            {i === 3 && (
              <div className="mt-3 flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-white/20" />
                <div className="h-1 w-12 bg-white/30 mt-1.5" />
                <div className="h-1 w-8 bg-white/15 mt-1" />
                <div className="mt-2 grid grid-cols-3 gap-0.5 w-full">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="aspect-square rounded bg-white/8" />
                  ))}
                </div>
              </div>
            )}
            {i === 4 && (
              <div className="mt-3 space-y-1">
                <div className="h-2 w-full bg-white/15 rounded" />
                <div className="h-2 w-2/3 bg-white/15 rounded" />
                <div className="mt-1 h-8 rounded bg-white/8" />
                <div className="mt-1 h-1.5 w-1/2 bg-white/25 rounded" />
              </div>
            )}
            {i === 5 && (
              <div className="mt-3">
                <div className="h-4 w-full rounded bg-white/15" />
                <div className="mt-1 space-y-0.5">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-2 w-full bg-white/8 rounded" />
                  ))}
                </div>
              </div>
            )}
            {i === 6 && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <div className="h-8 w-8 rounded-full bg-white/15" />
                <div className="h-1 w-10 bg-white/30 rounded mt-1" />
                <div className="mt-1 h-3 w-full bg-white/8 rounded" />
                <div className="h-3 w-full bg-white/8 rounded" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "78%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease }}
          className="h-full bg-gradient-to-r from-white/30 to-white/80"
        />
      </div>
    </div>
  );
}

function EditVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.025] to-white/[0.005] p-5 h-full">
      <div className="grid grid-cols-[1fr_120px] gap-3 h-full">
        {/* Mock phone */}
        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-2 relative overflow-hidden">
          <div className="aspect-[9/16] rounded-md bg-gradient-to-b from-[#0c0c12] to-[#06060a] p-3 relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1.5 w-8 bg-black rounded-full" />
            <div className="mt-3 space-y-2">
              <div className="h-2 w-1/2 bg-white/30 rounded" />
              <div className="h-12 w-full rounded-xl bg-white/10 border border-white/10 p-2">
                <div className="h-1.5 w-2/3 bg-white/40 rounded" />
                <div className="mt-1.5 h-1 w-1/3 bg-white/20 rounded" />
              </div>
              <div className="h-1.5 w-full bg-white/15 rounded" />
              <div className="h-1.5 w-3/4 bg-white/15 rounded" />
              <div className="h-8 w-full rounded-full bg-white mt-2" />
            </div>
          </div>
        </div>
        {/* Inspector */}
        <div className="space-y-2 text-[9px] font-mono">
          <div className="text-white/40 uppercase tracking-widest mb-2">Props</div>
          {[
            { l: "Radius", v: "16" },
            { l: "Padding", v: "24" },
            { l: "Color", v: "#FFF" },
            { l: "Shadow", v: "med" },
            { l: "Type", v: "lg" },
          ].map((p) => (
            <div key={p.l} className="flex justify-between border-b border-white/[0.05] pb-1.5">
              <span className="text-white/40">{p.l}</span>
              <span className="text-white/85">{p.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11.5px] uppercase tracking-[0.2em] text-white/40">
              Three steps
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-medium tracking-[-0.03em] text-silver-shine text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            One workflow.
            <br />
            <span className="italic font-serif font-light">Infinite outcomes.</span>
          </h2>
        </motion.div>

        <div className="space-y-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1, ease }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-6 lg:p-10 ${
                idx === 1 ? "" : ""
              }`}
            >
              <div className={`flex flex-col justify-center ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest">
                    {feature.num}
                  </span>
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  <span className="text-[11px] font-mono text-white/70 uppercase tracking-widest">
                    {feature.title}
                  </span>
                </div>
                <h3 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium text-silver-shine tracking-[-0.02em] leading-tight">
                  {feature.headline}
                </h3>
                <p className="mt-5 text-[15px] text-white/55 leading-relaxed max-w-md">
                  {feature.description}
                </p>
                <div className="mt-8 flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/40 font-mono">
                  <span className="h-1 w-1 rounded-full bg-white/60" />
                  Step {feature.num} of 03
                </div>
              </div>
              <div className={`min-h-[340px] ${idx % 2 === 1 ? "lg:order-1" : ""}`}>
                {feature.visual}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}