import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const VALUES = [
  {
    title: "Designers and developers, together.",
    desc: "We believe great software happens when design and engineering speak the same language. FRAME is built so both sides can move without translation.",
  },
  {
    title: "Speed compounds.",
    desc: "The fastest way from idea to working interface is the best way. Every minute saved is a minute spent on the actual problem.",
  },
  {
    title: "Restraint is a feature.",
    desc: "Our product is dark, minimal and quiet — because your work should be the loudest thing in the room.",
  },
  {
    title: "Production-grade by default.",
    desc: "No toy exports. No half-baked components. Everything you ship from FRAME is clean, accessible, and ready for a real codebase.",
  },
];

const STATS = [
  { v: "120k+", l: "Designers & developers" },
  { v: "8M+", l: "Mobile screens generated" },
  { v: "92", l: "NPS score" },
  { v: "37", l: "Countries" },
];

const TEAM = [
  { name: "Mira Chen", role: "Co-founder & CEO", initials: "MC" },
  { name: "Aarav Patel", role: "Co-founder & CTO", initials: "AP" },
  { name: "Sofia Reyes", role: "Head of Design", initials: "SR" },
  { name: "Jonas Lindqvist", role: "Head of AI", initials: "JL" },
  { name: "Hana Mori", role: "Head of Engineering", initials: "HM" },
  { name: "Daniel Okafor", role: "Head of Growth", initials: "DO" },
];

export function About() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="About FRAME"
          title="We build the tool we always wanted."
          italic="For makers shipping at the speed of thought."
          description="FRAME is a small, focused team in Berlin and San Francisco building the design-to-code tool we wished existed during our own careers at Apple, Figma, Stripe and Vercel."
        />
      }
    >
      {/* Stats band */}
      <section className="py-16 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-[clamp(2rem,4vw,3rem)] text-silver-shine font-light tracking-tight">
                {s.v}
              </div>
              <div className="text-[11.5px] text-white/45 mt-1.5 uppercase tracking-widest font-mono">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-4">
            The story
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight mb-8">
            From internal hackathon to a public beta in 18 months.
          </h2>
          <div className="space-y-5 text-[15px] text-white/65 leading-relaxed">
            <p>
              FRAME started as an internal hackathon project at Vercel in late 2024.
              Mira and Aarav were pairing on a way to spin up mobile UI directly
              from a design spec. What began as a weekend prototype became the
              seed of a much bigger idea: what if anyone — not just designers
              with years of Figma practice — could ship a polished mobile app
              on a Friday afternoon?
            </p>
            <p>
              We spent the next 14 months quietly building, testing with a few
              thousand designers and developers, and rebuilding. In spring 2026
              we opened the public beta. The response was overwhelming — within
              eight weeks we had more than 100,000 users creating real production
              apps.
            </p>
            <p>
              Today, FRAME is a 22-person company backed by a small group of
              investors who care about craft, restraint, and the long arc of
              software. We're still in beta. We're still listening.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
              What we believe
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight">
              Principles, not slogans.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06]">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-[#08080B] p-7 md:p-9">
                <h3 className="text-[18px] text-white font-medium tracking-tight mb-3">
                  {v.title}
                </h3>
                <p className="text-[13.5px] text-white/55 leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
              Leadership
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] text-silver-shine tracking-[-0.02em] leading-tight">
              The people building FRAME.
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 flex items-center gap-4 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
              >
                <div
                  className="h-12 w-12 rounded-full grid place-items-center text-[12px] font-medium text-white border border-white/[0.1] flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #1a1a20 0%, #0a0a0d 100%)",
                  }}
                >
                  {m.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] text-white font-medium truncate">
                    {m.name}
                  </div>
                  <div className="text-[11.5px] text-white/45 truncate">
                    {m.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Back to home */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h3 className="text-[24px] text-silver-shine tracking-[-0.02em] mb-3">
            Build something with FRAME.
          </h3>
          <p className="text-[14px] text-white/50 mb-6">
            The fastest way to know what we believe is to use the product.
          </p>
          <a
            href="#home"
            className="btn-primary px-6 py-3 text-[13px] inline-flex items-center gap-2"
          >
            Start Designing
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
