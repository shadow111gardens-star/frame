import { PageLayout } from "../PageLayout";
import { POSTS } from "./blogData";

export function BlogPost({ slug }: { slug: string }) {
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <PageLayout>
        <div className="min-h-[60vh] grid place-items-center px-6 py-24 text-center">
          <div>
            <h1 className="text-[28px] text-silver-shine tracking-[-0.02em] mb-3">
              Post not found
            </h1>
            <p className="text-white/55 mb-6">
              The article you're looking for doesn't exist.
            </p>
            <a href="#blog" className="btn-primary px-5 py-2.5 text-[12.5px] inline-block">
              Back to blog
            </a>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <article className="pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <a
            href="#blog"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white transition-colors mb-10"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to blog
          </a>

          <header className="mb-10">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-widest text-white/45 font-mono mb-4">
              <span>{post.category}</span>
              <span>·</span>
              <span>{post.readTime}</span>
              <span>·</span>
              <span>{post.date}</span>
            </div>
            <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] text-silver-shine tracking-[-0.03em] leading-[1.05] mb-6">
              {post.title}
            </h1>
            <p className="text-[16px] text-white/55 leading-relaxed mb-6">
              {post.excerpt}
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div
                className="h-10 w-10 rounded-full grid place-items-center text-[12px] font-medium text-white border border-white/[0.1]"
                style={{ background: "linear-gradient(135deg, #1a1a20 0%, #0a0a0d 100%)" }}
              >
                {post.author.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="text-[13.5px] text-white font-medium">{post.author}</div>
                <div className="text-[11px] text-white/45">FRAME</div>
              </div>
            </div>
          </header>

          {/* Cover */}
          <div
            className="rounded-2xl border border-white/[0.08] aspect-[16/9] mb-12 grid place-items-center"
            style={{
              background:
                "linear-gradient(135deg, #0e0e12 0%, #0a0a0d 50%, #050507 100%)",
            }}
          >
            <div className="text-center px-6">
              <div className="text-[10px] uppercase tracking-widest text-white/35 font-mono mb-2">
                {post.category}
              </div>
              <div className="text-[20px] text-white/70 font-light tracking-tight max-w-md mx-auto leading-snug">
                {post.title}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="prose-frame space-y-5 text-[16px] text-white/70 leading-[1.75]">
            <p>
              This is a placeholder article body. In production, posts would
              render rich content from markdown. The full content for{" "}
              <em className="text-white/85">{post.title}</em> is available in
              our CMS and would be loaded here.
            </p>
            <p>
              At FRAME, we believe that great writing about design and
              engineering is part of building great products. Every member of
              our team publishes regularly — not because they have to, but
              because the work is more interesting when you share it.
            </p>
            <h2 className="text-[24px] text-white font-medium tracking-tight pt-4">
              A short note on craft
            </h2>
            <p>
              We treat this blog like a product surface. That means careful
              typography, deliberate pacing, and respect for the reader's
              time. The same principles that shape FRAME's interface shape the
              way we write about it.
            </p>
            <p>
              If you'd like to write for us, or pitch a guest post, we'd love
              to hear from you. Reach out at{" "}
              <a
                href="mailto:hello@frame.studio"
                className="text-white underline-offset-4 hover:underline"
              >
                hello@frame.studio
              </a>
              .
            </p>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/[0.06] flex items-center justify-between">
            <a
              href="#blog"
              className="text-[13px] text-white/55 hover:text-white transition-colors"
            >
              ← All posts
            </a>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 font-mono">Share</span>
              {["Twitter", "LinkedIn", "Copy link"].map((s) => (
                <button
                  key={s}
                  className="h-7 px-2.5 rounded-md text-[11px] text-white/55 hover:text-white border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
