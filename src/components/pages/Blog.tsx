import { useState } from "react";
import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";
import { POSTS, CATEGORIES, BlogPost as BlogPostType } from "./blogData";

export function Blog() {
  const [category, setCategory] = useState("All");
  const filtered =
    category === "All" ? POSTS : POSTS.filter((p) => p.category === category);
  const featured = filtered.find((p) => p.featured) ?? filtered[0];
  const rest = filtered.filter((p) => p !== featured);

  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="FRAME Blog"
          title="Notes on building"
          italic="the future of mobile design."
          description="Field notes from the FRAME team. Research, interviews, design philosophy, and the occasional opinion about typography."
        />
      }
    >
      {/* Category filter */}
      <section className="pb-8 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1.5 overflow-x-auto ws-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-all ${
                category === c
                  ? "bg-white text-black"
                  : "text-white/55 hover:text-white border border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-6">
            <a
              href={`#blog/${featured.slug}`}
              className="group grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 rounded-3xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] p-8 lg:p-10 transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                    Featured
                  </span>
                  <span className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                    {featured.category}
                  </span>
                </div>
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] text-silver-shine tracking-[-0.02em] leading-[1.1] mb-4 group-hover:text-white transition-colors">
                  {featured.title}
                </h2>
                <p className="text-[15px] text-white/55 leading-relaxed mb-6">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-3 text-[12px] text-white/45">
                  <span>{featured.author}</span>
                  <span>·</span>
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
              <div
                className="rounded-2xl border border-white/[0.08] aspect-[4/3] grid place-items-center"
                style={{
                  background:
                    "linear-gradient(135deg, #0e0e12 0%, #0a0a0d 50%, #050507 100%)",
                }}
              >
                <div className="text-center px-6">
                  <div className="text-[10px] uppercase tracking-widest text-white/35 font-mono mb-2">
                    {featured.category}
                  </div>
                  <div className="text-[15px] text-white/65 font-medium leading-snug max-w-[220px] mx-auto">
                    {featured.title}
                  </div>
                </div>
              </div>
            </a>
          </div>
        </section>
      )}

      {/* All posts grid */}
      <section className="py-8 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-6">
            All posts · {filtered.length}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((p: BlogPostType) => (
              <a
                key={p.slug}
                href={`#blog/${p.slug}`}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] p-6 transition-all flex flex-col"
              >
                <div
                  className="rounded-xl border border-white/[0.06] aspect-[16/10] mb-5 grid place-items-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #0e0e12 0%, #0a0a0d 50%, #050507 100%)",
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest text-white/35 font-mono">
                    {p.category}
                  </div>
                </div>
                <h3 className="text-[16px] text-white font-medium tracking-tight leading-snug mb-2.5 group-hover:text-silver-shine transition-colors">
                  {p.title}
                </h3>
                <p className="text-[12.5px] text-white/50 leading-relaxed line-clamp-3 flex-1">
                  {p.excerpt}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-white/40 mt-4 pt-4 border-t border-white/[0.04]">
                  <span>{p.author}</span>
                  <span>·</span>
                  <span>{p.readTime}</span>
                </div>
              </a>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-white/40 py-16">
              No posts in this category yet.
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
