import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

interface Project {
  id: string;
  title: string;
  maker: string;
  category: string;
  blurb: string;
  metrics: { label: string; value: string }[];
  color: string;
  icon: string;
  featured?: boolean;
}

const PROJECTS: Project[] = [
  {
    id: "p-1",
    title: "Runway — marathon training",
    maker: "Saoirse O'Connell",
    category: "Health & Fitness",
    blurb:
      "Marathon training app built entirely in FRAME in 6 days. The coach view, race-day protocol screen and weekly mileage chart are studio-quality.",
    metrics: [
      { label: "Users", value: "12k" },
      { label: "App Store", value: "4.8★" },
      { label: "Built in", value: "6d" },
    ],
    color: "#7AA2FF",
    icon: "◇",
    featured: true,
  },
  {
    id: "p-2",
    title: "Ledgerly — freelancer finance",
    maker: "Marcus Whitfield",
    category: "Finance",
    blurb:
      "A budgeting app for freelancers with quarterly tax estimates, invoice tracking, and a beautiful burn-down chart.",
    metrics: [
      { label: "MRR", value: "$8.2k" },
      { label: "Built in", value: "11d" },
    ],
    color: "#9ED7C0",
    icon: "◆",
    featured: true,
  },
  {
    id: "p-3",
    title: "Halcyon — meditation",
    maker: "Yara Nazari",
    category: "Health & Fitness",
    blurb: "A meditation app that quietly learns when you need a moment.",
    metrics: [
      { label: "Sessions", value: "240k" },
      { label: "Subscribers", value: "3.4k" },
    ],
    color: "#C5B6FF",
    icon: "○",
  },
  {
    id: "p-4",
    title: "Atelier — clothing resale",
    maker: "Ji-woo Park",
    category: "Commerce",
    blurb: "Curated second-hand fashion marketplace. Editorial-style product cards.",
    metrics: [{ label: "GMV", value: "$120k/mo" }],
    color: "#E8C77E",
    icon: "△",
  },
  {
    id: "p-5",
    title: "Cumulus — habit streaks",
    maker: "Aleksei Volkov",
    category: "Productivity",
    blurb: "Daily habit tracker with elegant streak visualization and shareable weekly summaries.",
    metrics: [{ label: "DAU", value: "8.1k" }],
    color: "#E89494",
    icon: "□",
  },
  {
    id: "p-6",
    title: "Almanac — local events",
    maker: "Ines Beirao",
    category: "Travel",
    blurb: "Hyperlocal events discovery. Maps, filters, friends going.",
    metrics: [{ label: "Cities", value: "14" }],
    color: "#9CC7E8",
    icon: "▷",
  },
];

export function Showcase() {
  const featured = PROJECTS.find((p) => p.featured);
  const rest = PROJECTS.filter((p) => !p.featured);

  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Showcase"
          title="Made with"
          italic="FRAME."
          description="Real apps. Real users. Real revenue. Every project on this page was designed and built with FRAME — no Photoshop, no Figma, no hand-coded screens."
        />
      }
    >
      {/* Featured */}
      {featured && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div
              className="rounded-3xl border border-white/[0.08] overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${featured.color}10 0%, #0a0a0d 60%)`,
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
                <div className="p-8 lg:p-12">
                  <div className="text-[10px] uppercase tracking-widest text-white/45 font-mono mb-3">
                    Featured
                  </div>
                  <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] text-silver-shine tracking-[-0.02em] leading-[1.1] mb-4">
                    {featured.title}
                  </h2>
                  <p className="text-[14.5px] text-white/60 leading-relaxed mb-6">
                    {featured.blurb}
                  </p>
                  <div className="flex items-center gap-2 text-[12px] text-white/55 mb-6">
                    <div
                      className="h-7 w-7 rounded-full grid place-items-center text-[10px] font-medium text-white border border-white/[0.1]"
                      style={{
                        background: `linear-gradient(135deg, ${featured.color} 0%, ${featured.color}33 100%)`,
                      }}
                    >
                      {featured.maker.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span>by {featured.maker}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {featured.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg border border-white/[0.06] bg-black/30 p-3"
                      >
                        <div className="text-[18px] text-white font-light tracking-tight">
                          {m.value}
                        </div>
                        <div className="text-[10.5px] text-white/45 uppercase tracking-widest font-mono mt-0.5">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="aspect-[4/3] lg:aspect-auto grid place-items-center p-12 border-l border-white/[0.04]"
                  style={{
                    background: "linear-gradient(180deg, #0a0a0d 0%, #050507 100%)",
                  }}
                >
                  <div
                    className="h-24 w-24 rounded-2xl grid place-items-center text-[36px]"
                    style={{
                      background: `linear-gradient(135deg, ${featured.color} 0%, ${featured.color}33 100%)`,
                      boxShadow: `0 0 60px ${featured.color}33`,
                    }}
                  >
                    {featured.icon}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="py-8 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-6">
            More from the community
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] p-6 transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center text-[16px] flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}33 100%)`,
                    }}
                  >
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] text-white font-medium truncate">
                      {p.title}
                    </h3>
                    <div className="text-[11.5px] text-white/45 truncate">
                      {p.category}
                    </div>
                  </div>
                </div>
                <p className="text-[12.5px] text-white/55 leading-relaxed mb-4">
                  {p.blurb}
                </p>
                <div className="flex items-center gap-3 text-[10.5px] text-white/45 mb-4">
                  <span>by {p.maker}</span>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-white/[0.04]">
                  {p.metrics.map((m) => (
                    <div key={m.label}>
                      <div className="text-[13px] text-white font-medium">{m.value}</div>
                      <div className="text-[9.5px] text-white/40 uppercase tracking-widest font-mono">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center border-t border-white/[0.04]">
        <div className="max-w-xl mx-auto px-6">
          <h3 className="text-[24px] text-silver-shine tracking-[-0.02em] mb-3">
            Build the next one.
          </h3>
          <p className="text-[14px] text-white/55 mb-6">
            Submit your project to the showcase. Real users, real feedback.
          </p>
          <a href="mailto:showcase@frame.studio" className="btn-primary px-6 py-3 text-[13px] inline-block">
            Submit your project
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
