import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

interface Entry {
  version: string;
  date: string;
  type: "Major" | "Improvement" | "Fix";
  title: string;
  items: string[];
}

const ENTRIES: Entry[] = [
  {
    version: "v2.0.0",
    date: "May 4, 2026",
    type: "Major",
    title: "Laptop preview · Appllama integration · Credits system",
    items: [
      "New device selector with MacBook Pro 16, MacBook Air 13, Dell XPS 15, ThinkPad X1 and more.",
      "Real laptop mockups in Prototype mode — open your web design in a MacBook frame.",
      "Appllama MCP integration for research-driven design generation.",
      "Per-project credit usage tracking with monthly reset.",
      "New AI preferences: model selection (Frame 1 / Pro / Research) and tone control.",
    ],
  },
  {
    version: "v1.9.0",
    date: "Apr 22, 2026",
    type: "Improvement",
    title: "Inspector · Files panel · Inspector live editing",
    items: [
      "Inspector now supports live property editing without modal popovers.",
      "New Files panel with folder expand/collapse and quick search.",
      "Drag-and-drop attachments in the chat panel.",
      "Undo / redo now treats each AI request as a single transaction.",
      "Onboarding flow redesigned.",
    ],
  },
  {
    version: "v1.8.1",
    date: "Apr 9, 2026",
    type: "Fix",
    title: "Bug fixes and stability",
    items: [
      "Fixed: iPhone SE preview was sometimes cropped at the bottom navigation.",
      "Fixed: Inspector sliders occasionally lost precision on hover.",
      "Fixed: Prototype tab bar highlight disappeared after screen rename.",
      "Improved: faster initial load on the workspace (~30% smaller bundle).",
    ],
  },
  {
    version: "v1.8.0",
    date: "Mar 28, 2026",
    type: "Major",
    title: "Export to React Native + Expo",
    items: [
      "Export a full Expo project with screens, components, and design tokens.",
      "TypeScript-first output. Optional strict mode.",
      "Theme tokens are emitted as a typed `theme.ts` file.",
      "Component variants are preserved across the codebase.",
    ],
  },
  {
    version: "v1.7.0",
    date: "Mar 14, 2026",
    type: "Major",
    title: "Prototype mode",
    items: [
      "Connect screens with interactive bottom navigation.",
      "Test user flows end-to-end before exporting code.",
      "Animated transitions between screens.",
    ],
  },
  {
    version: "v1.6.0",
    date: "Feb 28, 2026",
    type: "Improvement",
    title: "Component selection · Inspector redesign",
    items: [
      "Click any component on the canvas to select it.",
      "New Inspector layout: Component / Typography / Spacing sections.",
      "Selection highlight uses a soft silver ring at 1.5px.",
    ],
  },
  {
    version: "v1.5.0",
    date: "Feb 4, 2026",
    type: "Major",
    title: "Public beta launch",
    items: [
      "FRAME is now open to everyone. No invite required.",
      "Welcome flow for new users.",
      "12 starter templates across the most common app categories.",
    ],
  },
];

const TYPE_STYLES: Record<Entry["type"], string> = {
  Major: "bg-sky-400/10 text-sky-300/90 border-sky-400/20",
  Improvement: "bg-emerald-400/10 text-emerald-300/90 border-emerald-400/20",
  Fix: "bg-white/[0.04] text-white/65 border-white/[0.08]",
};

export function Changelog() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Changelog"
          title="What's new"
          italic="in FRAME."
          description="Every release, every improvement, every fix. We ship a lot, and we document all of it here."
        />
      }
    >
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-10">
            {ENTRIES.map((e) => (
              <article
                key={e.version}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-8"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-mono text-white/85">
                    {e.version}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full border ${TYPE_STYLES[e.type]}`}
                  >
                    {e.type}
                  </span>
                  <span className="text-[11px] text-white/40 font-mono">{e.date}</span>
                </div>
                <h2 className="text-[20px] text-silver-shine tracking-[-0.02em] font-medium mb-4">
                  {e.title}
                </h2>
                <ul className="space-y-2">
                  {e.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-[13.5px] text-white/70 leading-relaxed"
                    >
                      <span className="text-white/30 mt-2 h-1 w-1 rounded-full bg-white/30 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center text-[12px] text-white/35 font-mono">
            Older releases available on GitHub.
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
