import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const SECTIONS = [
  {
    title: "What are cookies?",
    body: "Cookies are small text files that websites store on your device to remember information between visits. FRAME uses cookies and similar technologies (local storage, session storage) to provide and improve the product.",
  },
  {
    title: "Cookies we use",
    body: "We use only the cookies necessary to run FRAME. We do not use third-party advertising cookies, ever.",
    table: [
      ["Cookie", "Purpose", "Duration", "Type"],
      ["session", "Authentication and CSRF protection", "Session", "Essential"],
      ["frame.prefs", "UI preferences (sidebar collapsed, theme)", "1 year", "Functional"],
      ["frame.workspace.v1", "Local persistence of your open project", "Persistent", "Functional"],
      ["__cf_bm", "Bot protection for our CDN", "30 minutes", "Essential"],
    ],
  },
  {
    title: "What we don't use",
    body: "We do not use Google Analytics, Facebook Pixel, or any third-party advertising or marketing cookies. We do not sell or share your data.",
  },
  {
    title: "Managing cookies",
    body: "You can clear cookies from your browser at any time. Most browsers allow you to block all cookies or only third-party cookies. Note that blocking essential cookies will prevent FRAME from working properly.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this cookie policy from time to time. We will notify you of any material changes via email and a banner in the application.",
  },
  {
    title: "Contact",
    body: "Questions about cookies? Email us at privacy@frame.studio. We respond within 24 hours.",
  },
];

export function Cookies() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Cookie policy"
          title="Cookies."
          italic="Just the essentials."
          description="We use the minimum cookies necessary to run FRAME. No advertising trackers, no third-party analytics, no data sales."
        />
      }
    >
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-[20px] text-silver-shine tracking-[-0.02em] font-medium mb-3">
                {s.title}
              </h2>
              <p className="text-[14.5px] text-white/65 leading-[1.75] mb-4">
                {s.body}
              </p>
              {s.table && (
                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                  <table className="w-full text-[12.5px]">
                    <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                      <tr>
                        {s.table[0].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 text-[10.5px] uppercase tracking-widest text-white/45 font-mono"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.slice(1).map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`px-4 py-2.5 ${j === 0 ? "font-mono text-white/85" : "text-white/65"}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <div className="pt-6 border-t border-white/[0.06] text-[11px] text-white/35 font-mono">
            Last updated: May 1, 2026
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
