import { useState } from "react";
import { PageLayout } from "../PageLayout";

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    pages: [
      { id: "intro", title: "Introduction", body: "FRAME is an AI-powered mobile design tool that turns a simple idea into a polished, editable mobile interface. Type a description, watch FRAME design the first version, then refine every detail in our visual editor." },
      { id: "install", title: "Quick start", body: "Open app.frame.studio, click New Chat, and describe your app in natural language. Within 60 seconds you'll have a working mobile design you can click into, edit, and export to React Native code." },
      { id: "tour", title: "A tour of FRAME", body: "The workspace has three areas. The left panel is your AI conversation. The center is the live design surface. The right panel is the inspector with all editable properties." },
    ],
  },
  {
    id: "ai",
    title: "AI & generation",
    pages: [
      { id: "prompts", title: "Writing great prompts", body: "Describe the audience, the main task, and the feeling. The more specific you are, the closer the first version is to what you want. Mention platforms (iOS / Android), reference apps, or specific colors." },
      { id: "models", title: "Models & tone", body: "FRAME offers three models. Frame 1 is fast. Frame 1 Pro is the default. Frame Research uses the Appllama MCP for pattern-grounded generation. Each request is a single, undoable transaction." },
      { id: "actions", title: "AI actions", body: "FRAME's AI produces structured actions against your project: update component styles, add a screen, move components, change tokens. The actions are validated before they're applied, so you can trust the result." },
    ],
  },
  {
    id: "editor",
    title: "Editor",
    pages: [
      { id: "select", title: "Selecting components", body: "Click any element on the canvas to select it. Press Delete to remove. Hold Shift to multi-select. The selection ring is a subtle 1.5px silver outline." },
      { id: "inspector", title: "The Inspector", body: "When a component is selected, the Inspector shows Component, Typography, and Spacing sections. Every control is live — changes update the canvas in real time. Sliders are committed on mouse-up." },
      { id: "screens", title: "Managing screens", body: "Add new screens via the + New Screen button. Double-click a screen tab to rename. Drag to reorder. Click the × on hover to delete. Each screen has its own set of components." },
      { id: "devices", title: "Device preview", body: "Switch between iPhone 17 Pro Max, Pixel 9 Pro, Galaxy S25, MacBook Pro 16, and more. The preview updates instantly. The dimensions and notch style match the real device." },
    ],
  },
  {
    id: "export",
    title: "Export & code",
    pages: [
      { id: "rn", title: "Export to React Native", body: "Click Export in the top bar. Choose React Native / Expo. The output is a complete Expo project: screens/ with one file per screen, components/ with the components you used, and a theme.ts with your design tokens." },
      { id: "json", title: "Export as JSON", body: "Use JSON for backup, migration, or to import into your own tools. The full design state is included: screens, components, files, tokens." },
      { id: "screenshots", title: "Export screenshots", body: "FRAME renders each screen to a PNG at 3x resolution. Useful for marketing, App Store screenshots, or design review decks." },
    ],
  },
  {
    id: "api",
    title: "API & integrations",
    pages: [
      { id: "rest", title: "REST API", body: "FRAME exposes a REST API for triggering AI generation, reading project state, and pushing generated code to your own CI pipeline. Authentication is via API keys. Rate limits depend on your plan." },
      { id: "figma", title: "Figma plugin", body: "Our official Figma plugin lets you import designs from Figma into FRAME for editing, and export generated designs back to Figma. Available in the Figma Community." },
      { id: "webhooks", title: "Webhooks", body: "Subscribe to events: project.created, screen.added, export.completed, and more. Configure webhooks in Settings → API. Coming soon." },
    ],
  },
];

export function Docs() {
  const [activePage, setActivePage] = useState<string>("intro");
  const page = SECTIONS.flatMap((s) => s.pages).find((p) => p.id === activePage);
  const activeSection = SECTIONS.find((s) =>
    s.pages.some((p) => p.id === activePage)
  );

  return (
    <PageLayout>
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="text-[10.5px] uppercase tracking-widest text-white/35 font-mono mb-3">
              Documentation
            </div>
            <nav className="space-y-5">
              {SECTIONS.map((s) => (
                <div key={s.id}>
                  <div className="text-[12.5px] text-white/85 font-medium mb-2">
                    {s.title}
                  </div>
                  <ul className="space-y-0.5">
                    {s.pages.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => setActivePage(p.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors ${
                            activePage === p.id
                              ? "bg-white/[0.06] text-white"
                              : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                          }`}
                        >
                          {p.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main>
            <div className="text-[10.5px] uppercase tracking-widest text-white/35 font-mono mb-3">
              {activeSection?.title}
            </div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] text-silver-shine tracking-[-0.03em] leading-[1.05] mb-5">
              {page?.title}
            </h1>
            <p className="text-[16px] text-white/65 leading-[1.7] max-w-2xl">
              {page?.body}
            </p>

            {/* Code-like content block (for visual richness) */}
            <div className="mt-10 rounded-xl border border-white/[0.06] bg-[#08080B] overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 text-[11px] text-white/40 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                Example
              </div>
              <pre className="p-5 text-[12.5px] font-mono text-white/75 leading-relaxed overflow-x-auto">
{`// FRAME exports clean, accessible React Native
export default function Home() {
  return (
    <View style={styles.container}>
      <Header title="Workout" />
      <ActivityCard steps={8420} calories={620} workout={45} />
      <BottomNav active="home" />
    </View>
  );
}`}
              </pre>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-6">
              <button
                onClick={() => {
                  const all = SECTIONS.flatMap((s) => s.pages);
                  const i = all.findIndex((p) => p.id === activePage);
                  if (i > 0) setActivePage(all[i - 1].id);
                }}
                className="text-[12.5px] text-white/55 hover:text-white transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  const all = SECTIONS.flatMap((s) => s.pages);
                  const i = all.findIndex((p) => p.id === activePage);
                  if (i < all.length - 1) setActivePage(all[i + 1].id);
                }}
                className="text-[12.5px] text-white/85 hover:text-white transition-colors"
              >
                Next →
              </button>
            </div>
          </main>
        </div>
      </div>
    </PageLayout>
  );
}
