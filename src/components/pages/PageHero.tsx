import { ReactNode } from "react";

/**
 * Shared hero band used at the top of every inner page.
 * Same visual language as the landing Hero.
 */
export function PageHero({
  eyebrow,
  title,
  italic,
  description,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  italic?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(106,138,255,0.1) 0%, rgba(80,100,180,0.04) 30%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        <div className="absolute inset-0 ws-dot-bg opacity-40" />
        <div className="grain opacity-[0.02]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono">
              {eyebrow}
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
        )}
        <h1
          className="font-sans font-medium tracking-[-0.04em] text-silver-shine text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.02]"
        >
          <span className="block">{title}</span>
          {italic && (
            <span className="block italic font-serif font-light">{italic}</span>
          )}
        </h1>
        {description && (
          <p className="mt-6 text-[15px] sm:text-[16px] text-white/55 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
