import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const CHANNELS = [
  {
    name: "Discord",
    members: "12.4k",
    desc: "Real-time chat, support, and live AMAs with the team.",
    cta: "Join Discord",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.27 5.33A19.79 19.79 0 0 0 14.93 4l-.24.42a18.27 18.27 0 0 0-5.38 0L9.07 4a19.79 19.79 0 0 0-4.34 1.33A20.4 20.4 0 0 0 .33 17.67a19.86 19.86 0 0 0 6.05 3.07l1.2-1.6a13.18 13.18 0 0 1-1.9-.92l.47-.34a13.94 13.94 0 0 0 11.7 0l.47.34a13.18 13.18 0 0 1-1.9.92l1.2 1.6a19.86 19.86 0 0 0 6.05-3.07 20.4 20.4 0 0 0-4.4-12.34zM8.52 14.91a2.36 2.36 0 0 1-2.18-2.5 2.36 2.36 0 0 1 2.18-2.5 2.36 2.36 0 0 1 2.18 2.5 2.36 2.36 0 0 1-2.18 2.5zm6.96 0a2.36 2.36 0 0 1-2.18-2.5 2.36 2.36 0 0 1 2.18-2.5 2.36 2.36 0 0 1 2.18 2.5 2.36 2.36 0 0 1-2.18 2.5z" />
      </svg>
    ),
  },
  {
    name: "GitHub Discussions",
    members: "8.1k",
    desc: "Bug reports, feature requests, and roadmap conversation.",
    cta: "View on GitHub",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-2.07c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.05.78 2.12v3.14c0 .3.21.67.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
  {
    name: "X / Twitter",
    members: "26k",
    desc: "Product updates, design tips, and what we're shipping.",
    cta: "Follow @frame",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Office Hours",
    members: "Weekly",
    desc: "Live calls with the FRAME team every Thursday. Open mic.",
    cta: "Add to calendar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

const AMBASSADORS = [
  { name: "Devon Park", role: "Lead Engineer, Stripe", city: "San Francisco" },
  { name: "Maya Singh", role: "Designer, Linear", city: "Toronto" },
  { name: "Lucas Bauer", role: "Founder, Stack", city: "Berlin" },
  { name: "Yuki Tanaka", role: "iOS Engineer, Mercari", city: "Tokyo" },
];

const EVENTS = [
  { date: "Jun 12", title: "FRAME Live: shipping a wellness app in 90 minutes", type: "Livestream" },
  { date: "Jun 19", title: "Office Hours: AI-driven design systems", type: "Open mic" },
  { date: "Jul 03", title: "Showcase: best of June", type: "Community" },
  { date: "Jul 17", title: "FRAME Live: building a marketplace from scratch", type: "Livestream" },
];

export function Community() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Community"
          title="Built by people"
          italic="who love this work."
          description="12,000+ designers, developers, and founders shipping real apps with FRAME. Come hang out, share what you're building, and learn from each other."
        />
      }
    >
      {/* Channels */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHANNELS.map((c) => (
            <div
              key={c.name}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 flex items-start gap-4 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
            >
              <div className="h-12 w-12 rounded-xl border border-white/[0.08] bg-white/[0.04] grid place-items-center text-white/85 flex-shrink-0">
                {c.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-[15px] text-white font-medium">{c.name}</h3>
                  <span className="text-[10.5px] text-white/40 font-mono uppercase tracking-widest">
                    {c.members}
                  </span>
                </div>
                <p className="text-[12.5px] text-white/55 leading-relaxed mb-4">
                  {c.desc}
                </p>
                <button className="text-[12px] text-white border border-white/[0.15] rounded-full px-3.5 py-1.5 hover:bg-white/[0.04] transition-colors">
                  {c.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="py-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-6">
            Upcoming
          </div>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {EVENTS.map((e, i) => (
              <div
                key={e.title}
                className={`flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                  i !== EVENTS.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className="text-[12px] text-white/55 font-mono w-14">{e.date}</div>
                  <div>
                    <div className="text-[14px] text-white">{e.title}</div>
                    <div className="text-[10.5px] text-white/40 uppercase tracking-widest font-mono mt-0.5">
                      {e.type}
                    </div>
                  </div>
                </div>
                <button className="text-[11px] text-white/65 hover:text-white border border-white/[0.1] rounded-full px-3 py-1">
                  RSVP
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ambassadors */}
      <section className="py-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-3">
            FRAME Ambassadors
          </div>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] text-silver-shine tracking-[-0.02em] leading-tight mb-8">
            Builders, in the wild.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AMBASSADORS.map((a) => (
              <div
                key={a.name}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]"
              >
                <div
                  className="h-10 w-10 rounded-full grid place-items-center text-[11px] font-medium text-white border border-white/[0.1] flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1a1a20 0%, #0a0a0d 100%)" }}
                >
                  {a.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-[13.5px] text-white font-medium">{a.name}</div>
                  <div className="text-[11.5px] text-white/45">{a.role}</div>
                  <div className="text-[10.5px] text-white/35">{a.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
