import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const logos = [
  "Aether",
  "Linear",
  "Vercel",
  "Stripe",
  "Raycast",
  "Loom",
  "Arc",
  "Figma",
  "Notion",
  "Framer",
];

export function LogoMarquee() {
  return (
    <section className="relative py-12 border-y border-white/[0.04] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease }}
          className="text-center mb-8"
        >
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/35 font-mono">
            Trusted by teams shipping at
          </span>
        </motion.div>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#050507] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#050507] to-transparent z-10 pointer-events-none" />

        <div className="flex overflow-hidden">
          <div className="flex animate-marquee gap-12 whitespace-nowrap py-2">
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="text-[24px] font-light tracking-[-0.02em] text-white/35 hover:text-white/70 transition-colors flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}