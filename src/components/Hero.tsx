import { motion, type Variants } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1, delay: i * 0.1, ease },
  }),
};

function MiniScreen({
  type,
  delay = 0,
  translate = { x: 0, y: 0, rotate: 0 },
  className = "",
  showUI = true,
}: {
  type: "home" | "profile" | "chart" | "card" | "music" | "map";
  delay?: number;
  translate?: { x: number; y: number; rotate: number };
  className?: string;
  showUI?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${className}`}
      style={{
        transform: `translate(${translate.x}px, ${translate.y}px) rotate(${translate.rotate}deg)`,
      }}
    >
      <div
        className="phone-frame w-full h-full"
        style={{ animation: "drift 14s ease-in-out infinite" }}
      >
        <div className="phone-screen">
          <div className="notch" />
          {showUI && <ScreenContent type={type} />}
        </div>
      </div>
    </motion.div>
  );
}

function ScreenContent({ type }: { type: string }) {
  if (type === "home") {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e14] to-[#08080b] pt-14 px-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[9px] text-white/40 mb-0.5">Good morning</div>
            <div className="text-[13px] text-white font-medium">Alex</div>
          </div>
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-3 mb-3">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[8px] text-white/40 mb-0.5">Balance</div>
              <div className="text-[15px] font-medium text-white tracking-tight">$12,480</div>
            </div>
            <div className="text-[8px] text-emerald-300/80">+2.4%</div>
          </div>
          <div className="mt-2 h-8 flex items-end gap-[2px]">
            {[24, 38, 30, 52, 44, 60, 48, 70, 56, 80, 64, 88].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-sm bg-gradient-to-t from-white/20 to-white/40"
              />
            ))}
          </div>
        </div>
        <div className="text-[10px] text-white/50 mb-2">Quick actions</div>
        <div className="grid grid-cols-4 gap-2">
          {["Send", "Receive", "Pay", "More"].map((label) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-lg border border-white/[0.06] bg-white/[0.02]" />
              <div className="text-[7px] text-white/40">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {["Stripe Payout", "Figma", "Apple"].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.015] px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-white/10" />
                <div className="text-[8px] text-white/70">{n}</div>
              </div>
              <div className="text-[8px] text-white/40">-$24</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "chart") {
    return (
      <div className="absolute inset-0 bg-[#08080b] pt-14 px-4">
        <div className="text-[8px] text-white/40 mb-1">Activity</div>
        <div className="text-[14px] text-white font-medium mb-3">Heart Rate</div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 h-32 relative overflow-hidden">
          <svg viewBox="0 0 200 80" className="absolute inset-x-3 bottom-3 top-3 w-[calc(100%-24px)]">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0,50 C20,40 30,10 50,20 C70,30 80,70 100,55 C120,40 130,15 150,25 C170,35 180,55 200,45"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M0,50 C20,40 30,10 50,20 C70,30 80,70 100,55 C120,40 130,15 150,25 C170,35 180,55 200,45 L200,80 L0,80 Z"
              fill="url(#g)"
            />
          </svg>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["72 bpm", "8h", "1.2k"].map((v, i) => (
            <div key={i} className="rounded-lg border border-white/[0.05] p-2">
              <div className="text-[7px] text-white/40">Stat</div>
              <div className="text-[10px] text-white mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-12 rounded-xl border border-white/[0.06] bg-white/[0.015] p-2">
          <div className="text-[7px] text-white/40">Today's goal</div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-2/3 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>
    );
  }
  if (type === "profile") {
    return (
      <div className="absolute inset-0 bg-[#08080b] pt-14 px-4 flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 mt-2" />
        <div className="mt-2 text-[11px] text-white font-medium">Mira Chen</div>
        <div className="text-[8px] text-white/40">Product Designer</div>
        <div className="mt-3 flex gap-1.5">
          {["Follow", "Message"].map((t) => (
            <div
              key={t}
              className={`px-2.5 py-1 rounded-full text-[8px] ${
                t === "Follow"
                  ? "bg-white text-black"
                  : "border border-white/15 text-white/70"
              }`}
            >
              {t}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 w-full">
          {[
            { v: "248", l: "Posts" },
            { v: "12k", l: "Followers" },
            { v: "1.2k", l: "Likes" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-white/[0.05] py-1.5 text-center">
              <div className="text-[10px] text-white">{s.v}</div>
              <div className="text-[7px] text-white/40">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 w-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/[0.05]"
              style={{
                background: `linear-gradient(${(i * 37) % 360}deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (type === "card") {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c12] to-[#06060a] pt-14 px-4">
        <div className="text-[8px] text-white/40 mb-1">Featured</div>
        <div className="text-[13px] text-white font-medium mb-3">Discover</div>
        <div className="rounded-2xl border border-white/[0.06] p-3 bg-gradient-to-br from-white/[0.04] to-white/[0.01] h-32 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(180,200,255,0.4), transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="text-[7px] text-white/50 uppercase tracking-widest">New</div>
            <div className="text-[12px] text-white mt-1">Aether Watch</div>
            <div className="text-[8px] text-white/40 mt-0.5">$420</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { c: "from-white/15", t: "Studio" },
            { c: "from-white/10", t: "Focus" },
            { c: "from-white/5", t: "Sleep" },
          ].map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-md bg-gradient-to-br ${it.c} to-transparent border border-white/[0.05]`}
              />
              <div className="flex-1">
                <div className="text-[9px] text-white">{it.t}</div>
                <div className="text-[7px] text-white/40">12 min</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "music") {
    return (
      <div className="absolute inset-0 bg-[#08080b] pt-14 px-4">
        <div className="text-[8px] text-white/40 mb-1">Now playing</div>
        <div className="aspect-square rounded-xl bg-gradient-to-br from-white/10 to-white/[0.01] border border-white/[0.06] mb-3 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 200deg at 50% 50%, rgba(120,140,200,0.2), rgba(255,255,255,0.05), rgba(120,140,200,0.2))",
            }}
          />
        </div>
        <div className="text-[11px] text-white font-medium">Silent Wave</div>
        <div className="text-[8px] text-white/40 mb-2">Aether</div>
        <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 bg-white/60 rounded-full" />
        </div>
        <div className="flex justify-between text-[7px] text-white/30 mt-1">
          <span>1:24</span>
          <span>3:48</span>
        </div>
        <div className="mt-3 flex justify-center gap-4">
          <div className="h-6 w-6 rounded-full border border-white/20" />
          <div className="h-7 w-7 rounded-full bg-white" />
          <div className="h-6 w-6 rounded-full border border-white/20" />
        </div>
      </div>
    );
  }
  // map
  return (
    <div className="absolute inset-0 bg-[#08080b]">
      <div className="absolute inset-0 pt-14 px-4">
        <div className="text-[8px] text-white/40 mb-1">Nearby</div>
        <div className="text-[13px] text-white font-medium mb-3">Explore</div>
      </div>
      <div className="absolute inset-x-0 top-20 bottom-0">
        <svg className="w-full h-full opacity-50" viewBox="0 0 200 320">
          <defs>
            <linearGradient id="mapg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 40 + 10}
              x2="200"
              y2={i * 40 + 10}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 40 + 10}
              y1="0"
              x2={i * 40 + 10}
              y2="320"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          ))}
          <path
            d="M20,260 Q60,180 100,200 T180,80"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="180" cy="80" r="4" fill="white" />
          <circle cx="180" cy="80" r="8" fill="white" opacity="0.2" />
        </svg>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-28 pb-20">
      {/* Background atmosphere */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] atmos-glow"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(106,138,255,0.18) 0%, rgba(80,100,180,0.08) 30%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-1/4 left-1/3 w-[400px] h-[400px] atmos-glow"
          style={{
            background:
              "radial-gradient(circle, rgba(140,160,220,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050507]" />
        <div className="grain" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Eyebrow tag */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm px-3 py-1.5 mb-8"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-[11.5px] text-white/70 tracking-wide">
            Now in public beta · v2.0
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="font-sans font-medium tracking-[-0.04em] text-white"
          style={{
            fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
            lineHeight: 0.98,
          }}
        >
          <span className="block text-silver-shine">Turn ideas into</span>
          <span className="block italic font-serif font-light text-silver-shine tracking-[-0.02em]">
            beautiful mobile apps.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-7 max-w-2xl mx-auto text-[15px] sm:text-[16px] leading-relaxed text-white/55"
        >
          Describe your app. Let AI design the screens, refine the experience, and
          generate editable components ready for development.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#home"
            className="btn-primary px-6 py-3 text-[14px] inline-flex items-center gap-2"
          >
            Start Designing
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#workflow"
            className="btn-ghost px-6 py-3 text-[14px] inline-flex items-center gap-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            Explore the Editor
          </a>
        </motion.div>

        {/* Floating mobile screens */}
        <div className="relative mt-20 h-[520px] hidden md:block">
          <div className="absolute inset-0 flex items-center justify-center">
            <MiniScreen
              type="home"
              delay={0.3}
              className="absolute w-[180px] h-[370px]"
              translate={{ x: -290, y: 30, rotate: -9 }}
            />
            <MiniScreen
              type="chart"
              delay={0.45}
              className="absolute w-[180px] h-[370px]"
              translate={{ x: -160, y: -40, rotate: -4 }}
            />
            <MiniScreen
              type="card"
              delay={0.2}
              className="absolute w-[210px] h-[430px] z-10"
              translate={{ x: 0, y: 0, rotate: 0 }}
            />
            <MiniScreen
              type="music"
              delay={0.5}
              className="absolute w-[180px] h-[370px]"
              translate={{ x: 160, y: -30, rotate: 5 }}
            />
            <MiniScreen
              type="profile"
              delay={0.4}
              className="absolute w-[180px] h-[370px]"
              translate={{ x: 290, y: 40, rotate: 9 }}
            />
          </div>
        </div>

        {/* Tablet + Mobile simplified screens */}
        <div className="relative mt-14 h-[420px] md:hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <MiniScreen
              type="card"
              delay={0.2}
              className="absolute w-[180px] h-[370px] z-10"
              translate={{ x: 0, y: 0, rotate: 0 }}
            />
            <MiniScreen
              type="chart"
              delay={0.4}
              className="absolute w-[160px] h-[330px] opacity-60"
              translate={{ x: -120, y: 10, rotate: -6 }}
            />
            <MiniScreen
              type="music"
              delay={0.5}
              className="absolute w-[160px] h-[330px] opacity-60"
              translate={{ x: 120, y: 10, rotate: 6 }}
            />
          </div>
        </div>
      </div>

      {/* Bottom transition gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050507] pointer-events-none" />
    </section>
  );
}
