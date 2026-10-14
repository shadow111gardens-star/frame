import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const SECTIONS = [
  {
    label: "Design",
    items: [
      {
        title: "AI generation",
        desc: "Describe your app in natural language. FRAME designs the first version in 60 seconds — screens, components, design tokens.",
        icon: "◇",
      },
      {
        title: "Editable components",
        desc: "Every generated component is a real React-style component. Click to select, change colors, radius, padding, typography.",
        icon: "○",
      },
      {
        title: "Live device preview",
        desc: "Preview in iPhone, Android, or laptop frames. The preview updates instantly when you change styles.",
        icon: "△",
      },
      {
        title: "Design tokens",
        desc: "Every color, radius, and spacing scale is a token. Update once, change everywhere. Export as theme.ts.",
        icon: "□",
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        title: "Frame 1 / Pro / Research",
        desc: "Three models, one interface. Generate and refine editable designs using the configured server-side Gemini model.",
        icon: "▷",
      },
      {
        title: "Structured actions",
        desc: "FRAME's AI produces validated actions against your project: update styles, add screens, move components, change tokens.",
        icon: "◇",
      },
      {
        title: "Conversational refinement",
        desc: "Continue the conversation. FRAME remembers every change and you can revert any step.",
        icon: "○",
      },
      {
        title: "Reference uploads",
        desc: "Drop in screenshots, Figma files, or design references. FRAME uses them as design intent.",
        icon: "△",
      },
    ],
  },
  {
    label: "Code",
    items: [
      {
        title: "React Native + Expo",
        desc: "Export a complete Expo project with screens, components, and design tokens. Production-ready.",
        icon: "◐",
      },
      {
        title: "TypeScript-first",
        desc: "All exports are strict TypeScript. Props are typed. No any.",
        icon: "▤",
      },
      {
        title: "JSON export",
        desc: "Backup, migrate, or import into your own tools. Full design state included.",
        icon: "♢",
      },
      {
        title: "Version history",
        desc: "Every meaningful change is a version. Roll back, branch, or compare.",
        icon: "⬡",
      },
    ],
  },
  {
    label: "Workflow",
    items: [
      {
        title: "Undo / redo",
        desc: "Every operation is undoable. AI requests are single transactions so one click reverts a whole intent.",
        icon: "○",
      },
      {
        title: "Keyboard shortcuts",
        desc: "Undo, redo, zoom, fit, send. The whole workspace is keyboard-driven.",
        icon: "□",
      },
      {
        title: "Local persistence",
        desc: "Your projects, files, and chat history are saved automatically. Refresh-safe.",
        icon: "◆",
      },
      {
        title: "Multi-project",
        desc: "Manage many projects in the sidebar. Star favorites. Quick access from any device.",
        icon: "◢",
      },
    ],
  },
];

export function Features() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Features"
          title="Everything you need"
          italic="to ship a real app."
          description="FRAME is a complete design and code environment. AI generation, visual editing, real component code, device preview, and export — in one place."
        />
      }
    >
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          {SECTIONS.map((group) => (
            <div key={group.label}>
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-[clamp(1.4rem,2.4vw,1.8rem)] text-silver-shine tracking-[-0.02em] font-medium">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
                  >
                    <div className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] grid place-items-center text-[14px] text-white/85 mb-3">
                      {item.icon}
                    </div>
                    <h3 className="text-[14px] text-white font-medium mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-[12.5px] text-white/55 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
