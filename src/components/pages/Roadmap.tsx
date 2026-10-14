import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

interface Item {
  title: string;
  desc: string;
  status: "shipped" | "in-progress" | "planned";
  tag: string;
}

const ITEMS: { quarter: string; label: string; items: Item[] }[] = [
  {
    quarter: "Q2 2026",
    label: "Now",
    items: [
      {
        title: "Web preview",
        tag: "Design",
        status: "shipped",
        desc: "Preview your design in MacBook, Dell, or ThinkPad frames. Web design support is now first-class.",
      },
      {
        title: "Credits & billing",
        tag: "Account",
        status: "shipped",
        desc: "Per-project credit usage with monthly reset and per-tier allocations.",
      },
    ],
  },
  {
    quarter: "Q3 2026",
    label: "In progress",
    items: [
      {
        title: "Real-time collaboration",
        tag: "Collaboration",
        status: "in-progress",
        desc: "Live cursors, comments, and multiplayer editing. Like Figma, but for mobile.",
      },
      {
        title: "Component libraries",
        tag: "Design",
        status: "in-progress",
        desc: "Publish your components as a versioned library. Pull from public libraries maintained by Stripe, Vercel, and others.",
      },
      {
        title: "Native iOS & Android export",
        tag: "Export",
        status: "in-progress",
        desc: "Export directly to Xcode and Android Studio, not just Expo. Coming this summer.",
      },
    ],
  },
  {
    quarter: "Q4 2026",
    label: "Planned",
    items: [
      {
        title: "AI design reviews",
        tag: "AI",
        status: "planned",
        desc: "Upload any design and get a structured review: contrast, hierarchy, accessibility, platform conventions.",
      },
      {
        title: "Public API & webhooks",
        tag: "Platform",
        status: "planned",
        desc: "Trigger AI generation from your own tools. Push generated code to your repo automatically.",
      },
      {
        title: "FRAME Studio desktop app",
        tag: "Platform",
        status: "planned",
        desc: "Native macOS app for offline editing and faster performance on big projects.",
      },
    ],
  },
];

const STATUS_STYLES: Record<Item["status"], { dot: string; text: string; bg: string }> = {
  shipped: { dot: "bg-emerald-400", text: "text-emerald-300/90", bg: "bg-emerald-400/[0.06] border-emerald-400/15" },
  "in-progress": { dot: "bg-amber-400", text: "text-amber-300/90", bg: "bg-amber-400/[0.06] border-amber-400/15" },
  planned: { dot: "bg-white/40", text: "text-white/60", bg: "bg-white/[0.03] border-white/[0.08]" },
};

const STATUS_LABEL: Record<Item["status"], string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  planned: "Planned",
};

export function Roadmap() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Roadmap"
          title="Where we're going."
          italic="Built in the open."
          description="A live view of what we're working on, what's shipping next, and what we're planning for the longer term. Updated monthly."
        />
      }
    >
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          {ITEMS.map((group) => (
            <div key={group.quarter}>
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-[clamp(1.4rem,2.5vw,1.8rem)] text-silver-shine tracking-[-0.02em] font-medium">
                  {group.quarter}
                </h2>
                <span className="text-[10.5px] uppercase tracking-widest text-white/40 font-mono">
                  {group.label}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const s = STATUS_STYLES[item.status];
                  return (
                    <div
                      key={item.title}
                      className={`rounded-xl border p-5 flex gap-4 ${s.bg}`}
                    >
                      <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0 relative">
                        <div className={`absolute inset-0 rounded-full ${s.dot}`} />
                        {item.status === "in-progress" && (
                          <div
                            className={`absolute inset-0 rounded-full ${s.dot} opacity-50 animate-ping`}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <h3 className="text-[15px] text-white font-medium">
                            {item.title}
                          </h3>
                          <span
                            className={`text-[10px] uppercase tracking-widest font-mono ${s.text}`}
                          >
                            {item.tag} · {STATUS_LABEL[item.status]}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/55 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit feedback */}
      <section className="py-12 border-t border-white/[0.04] text-center">
        <div className="max-w-md mx-auto px-6">
          <h3 className="text-[20px] text-silver-shine tracking-[-0.02em] mb-2">
            Have an idea?
          </h3>
          <p className="text-[13px] text-white/55 mb-5">
            We read every submission. The most-requested features become
            roadmap items within two weeks.
          </p>
          <a
            href="mailto:roadmap@frame.studio"
            className="btn-primary px-5 py-2.5 text-[12.5px] inline-block"
          >
            Submit a feature request
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
