import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const VALUES = [
  "Ship real work that customers pay for — no spec theater.",
  "Default to small teams. Big companies move slowly on purpose.",
  "Write down what you believe. Make decisions in writing.",
  "Bias for craft over speed, but never confuse polish for thinking.",
  "Disagree, commit, then execute. No silent resentment.",
];

const OPENINGS = [
  {
    role: "Senior AI Engineer",
    team: "Engineering",
    location: "San Francisco · Remote",
    type: "Full-time",
  },
  {
    role: "Founding Designer, Mobile",
    team: "Design",
    location: "San Francisco · Remote",
    type: "Full-time",
  },
  {
    role: "Frontend Engineer, Workspace",
    team: "Engineering",
    location: "San Francisco · Berlin · Remote",
    type: "Full-time",
  },
  {
    role: "Developer Relations Lead",
    team: "Growth",
    location: "Remote (Americas / Europe)",
    type: "Full-time",
  },
  {
    role: "Product Engineer, Code Generation",
    team: "Engineering",
    location: "San Francisco · Remote",
    type: "Full-time",
  },
  {
    role: "Visual Designer (Brand)",
    team: "Design",
    location: "Berlin · Remote",
    type: "Full-time",
  },
];

const PERKS = [
  ["Competitive equity", "Every full-time employee has a stake."],
  ["Healthcare", "Premium medical, dental, vision. 100% covered."],
  ["Time off", "Unlimited PTO with a real 4-week minimum."],
  ["Hardware", "Latest MacBook Pro, 4K display, premium peripherals."],
  ["Learning", "$2,500/year for books, courses, conferences."],
  ["Remote-first", "Work from anywhere. We sync 4 hours, async the rest."],
];

export function Careers() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Careers"
          title="Build the future of"
          italic="mobile design with us."
          description="We're a 22-person team working on a product that hundreds of thousands of developers use every day. We're hiring across engineering, design, and growth."
        />
      }
    >
      {/* Values */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
            How we work
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight mb-8">
            Operating principles.
          </h2>
          <ol className="space-y-4">
            {VALUES.map((v, i) => (
              <li
                key={i}
                className="flex gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]"
              >
                <span className="text-[11px] font-mono text-white/40 mt-1 flex-shrink-0 w-6">
                  0{i + 1}
                </span>
                <span className="text-[15px] text-white/75 leading-relaxed">{v}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Open roles */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
                Open roles
              </div>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight">
                {OPENINGS.length} positions open
              </h2>
            </div>
            <a
              href="mailto:careers@frame.studio"
              className="text-[12.5px] text-white/55 hover:text-white transition-colors"
            >
              Don't see a fit? Email us →
            </a>
          </div>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {OPENINGS.map((j, i) => (
              <a
                key={j.role}
                href={`mailto:careers@frame.studio?subject=${encodeURIComponent(j.role)}`}
                className={`group flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                  i !== OPENINGS.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[15px] text-white font-medium group-hover:text-silver-shine transition-colors">
                    {j.role}
                  </div>
                  <div className="text-[12px] text-white/45 mt-0.5">
                    {j.team} · {j.location} · {j.type}
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
            Perks & benefits
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight mb-8">
            The practical stuff.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06]">
            {PERKS.map(([title, desc]) => (
              <div key={title} className="bg-[#08080B] p-6">
                <div className="text-[14px] text-white font-medium mb-1">{title}</div>
                <div className="text-[12.5px] text-white/55 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring process */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
            How we hire
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight mb-8">
            Our process.
          </h2>
          <ol className="space-y-6">
            {[
              ["1", "Intro call", "30 minutes. We talk about you, the role, and what you're looking for. No trick questions."],
              ["2", "Take-home", "A small, real project. We pay for your time. 4-6 hours max."],
              ["3", "Technical conversations", "Two 90-minute calls with the team. We work through real problems together."],
              ["4", "Team day", "Meet 4-5 future teammates. We answer every question you have. You decide if we're a fit."],
              ["5", "Offer", "Usually within 2 weeks. We move fast, you should too."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-5">
                <div className="h-8 w-8 rounded-md bg-white/[0.04] border border-white/[0.08] grid place-items-center text-[12px] font-mono text-white/55 flex-shrink-0">
                  {n}
                </div>
                <div>
                  <div className="text-[15px] text-white font-medium mb-1">{t}</div>
                  <div className="text-[13px] text-white/55 leading-relaxed">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PageLayout>
  );
}
