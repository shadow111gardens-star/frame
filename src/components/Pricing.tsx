import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    desc: "For exploring ideas and one-screen concepts.",
    cta: "Start free",
    highlight: false,
    features: [
      "3 active projects",
      "AI screen drafts",
      "Basic editor",
      "Community support",
    ],
  },
  {
    name: "Studio",
    price: "$24",
    period: "per month",
    desc: "For shipping production-ready mobile apps.",
    cta: "Start free trial",
    highlight: true,
    features: [
      "Unlimited projects",
      "Full design system",
      "Editable components",
      "Code export · RN + TS",
      "GitHub sync",
      "Priority support",
    ],
  },
  {
    name: "Team",
    price: "Custom",
    period: "tailored for teams",
    desc: "For design teams shipping at scale.",
    cta: "Talk to sales",
    highlight: false,
    features: [
      "Everything in Studio",
      "Shared workspaces",
      "Brand kits & libraries",
      "Custom components",
      "SSO & SCIM",
      "Dedicated CSM",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11.5px] uppercase tracking-[0.2em] text-white/40">
              Pricing
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-medium tracking-[-0.03em] text-silver-shine text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            Simple. Honest.
          </h2>
          <p className="mt-6 text-[15px] sm:text-[16px] text-white/50 max-w-xl mx-auto">
            Start free. Upgrade when you ship. No hidden fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.9, ease }}
              className={`relative rounded-3xl border p-7 flex flex-col ${
                tier.highlight
                  ? "border-white/[0.15] bg-gradient-to-b from-white/[0.04] to-white/[0.01]"
                  : "border-white/[0.06] bg-gradient-to-b from-white/[0.015] to-transparent"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-black text-[10px] uppercase tracking-widest font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className="text-[12px] uppercase tracking-widest text-white/40 font-mono mb-3">
                  {tier.name}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] font-medium text-white tracking-[-0.03em]">
                    {tier.price}
                  </span>
                  <span className="text-[12px] text-white/40">{tier.period}</span>
                </div>
                <p className="mt-3 text-[13px] text-white/55">{tier.desc}</p>
              </div>

              <div className="h-px bg-white/[0.06] mb-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/70">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-white/60 mt-0.5 flex-shrink-0"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`${
                  tier.highlight ? "btn-primary" : "btn-ghost"
                } px-5 py-3 text-[13px] inline-flex items-center justify-center`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}