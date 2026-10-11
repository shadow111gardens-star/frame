import { useState } from "react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const colorPresets = [
  { name: "Pure", value: "#FFFFFF" },
  { name: "Silver", value: "#C0C0C8" },
  { name: "Sky", value: "#7AA2FF" },
  { name: "Mint", value: "#9ED7C0" },
  { name: "Amber", value: "#E8C77E" },
  { name: "Coral", value: "#E89494" },
];

const radiusOptions = [
  { name: "Sharp", value: "8px" },
  { name: "Soft", value: "16px" },
  { name: "Round", value: "24px" },
  { name: "Full", value: "999px" },
];

const typeOptions = [
  { name: "Sm", value: "11px" },
  { name: "Md", value: "13px" },
  { name: "Lg", value: "15px" },
  { name: "Xl", value: "18px" },
];

export function Inspector() {
  const [color, setColor] = useState("#FFFFFF");
  const [radius, setRadius] = useState("16px");
  const [typeSize, setTypeSize] = useState("15px");
  const [spacing, setSpacing] = useState(16);
  const [shadow, setShadow] = useState(0.4);

  return (
    <section className="relative py-32 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(120,150,210,0.12) 0%, transparent 60%)",
          filter: "blur(70px)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
          className="max-w-3xl mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[11.5px] uppercase tracking-[0.2em] text-white/40">
              Editable by design
            </span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-medium tracking-[-0.03em] text-silver-shine text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            Not an image.
            <br />
            <span className="italic font-serif font-light">A real editor.</span>
          </h2>
          <p className="mt-6 text-[15px] sm:text-[16px] text-white/50 max-w-xl">
            Every generated screen is a live composition of editable components.
            Tweak properties and watch your design update in real time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6"
        >
          {/* Phone preview */}
          <div className="relative rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-8 lg:p-12 flex items-center justify-center overflow-hidden min-h-[640px]">
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Crosshair guides */}
            <div className="absolute top-8 left-8 text-[10px] font-mono text-white/30 flex items-center gap-2">
              <span className="h-px w-4 bg-white/20" />
              <span>320 × 568</span>
            </div>
            <div className="absolute top-8 right-8 text-[10px] font-mono text-white/30 flex items-center gap-2">
              <span>FRAME · preview</span>
              <span className="h-px w-4 bg-white/20" />
            </div>

            <div className="relative">
              <div
                className="absolute -inset-10 -z-10 opacity-60"
                style={{
                  background: `radial-gradient(ellipse at center, ${hexToRgba(color, 0.2)} 0%, transparent 60%)`,
                  filter: "blur(50px)",
                  transition: "background 0.6s ease",
                }}
              />
              <div className="phone-frame w-[260px] h-[540px] lg:w-[300px] lg:h-[620px]">
                <div className="phone-screen">
                  <div className="notch" />
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-[#0c0c12] to-[#06060a] pt-14"
                    style={{ padding: `56px ${spacing + 12}px ${spacing}px` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-[9px] text-white/40">Settings</div>
                        <div
                          className="text-white font-medium tracking-tight transition-all"
                          style={{ fontSize: typeSize }}
                        >
                          Profile
                        </div>
                      </div>
                      <div
                        className="h-8 w-8 bg-gradient-to-br from-white/20 to-white/5 border border-white/10"
                        style={{ borderRadius: radius }}
                      />
                    </div>

                    {/* Avatar + Name */}
                    <div className="flex flex-col items-center mb-5">
                      <div
                        className="h-16 w-16 bg-gradient-to-br from-white/20 to-white/5 border border-white/10 mb-2"
                        style={{ borderRadius: radius }}
                      />
                      <div
                        className="text-white font-medium"
                        style={{ fontSize: typeSize }}
                      >
                        Alex Carter
                      </div>
                      <div className="text-[9px] text-white/40 mt-0.5">Pro Member</div>
                    </div>

                    {/* Main card (editable) */}
                    <div
                      className="border p-4 mb-3 transition-all duration-300"
                      style={{
                        borderRadius: radius,
                        borderColor: "rgba(255,255,255,0.08)",
                        background: `linear-gradient(180deg, ${hexToRgba(color, 0.05)} 0%, transparent 100%)`,
                        padding: `${spacing}px`,
                        boxShadow: `0 ${shadow * 6}px ${shadow * 18}px -${shadow * 4}px rgba(0,0,0,${shadow})`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div
                            className="text-white font-medium"
                            style={{ fontSize: typeSize }}
                          >
                            Subscription
                          </div>
                          <div className="text-[9px] text-white/40 mt-0.5">
                            Renews in 24 days
                          </div>
                        </div>
                        <div
                          className="px-3 py-1 rounded-full text-[9px] text-black font-medium"
                          style={{ background: color, borderRadius: radius }}
                        >
                          Active
                        </div>
                      </div>
                      <div
                        className="h-1 rounded-full bg-white/10 overflow-hidden mb-2"
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ background: color, width: "72%" }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-white/40">
                        <span>8.4 GB</span>
                        <span>12 GB</span>
                      </div>
                    </div>

                    {/* List items */}
                    <div className="space-y-2">
                      {["Notifications", "Privacy", "Help center"].map((t) => (
                        <div
                          key={t}
                          className="flex items-center justify-between border border-white/[0.06] bg-white/[0.015]"
                          style={{ borderRadius: radius, padding: `${spacing * 0.6}px ${spacing * 0.75}px` }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 border border-white/[0.06] bg-white/[0.04]"
                              style={{ borderRadius: Math.min(parseInt(radius) / 2, 8) + "px" }}
                            />
                            <div
                              className="text-white"
                              style={{ fontSize: typeSize }}
                            >
                              {t}
                            </div>
                          </div>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      className="w-full text-[12px] font-medium py-3 mt-4 transition-all"
                      style={{
                        background: color,
                        color: color === "#FFFFFF" || color === "#C0C0C8" || color === "#E8C77E" ? "#000" : "#fff",
                        borderRadius: radius,
                      }}
                    >
                      Manage account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inspector panel */}
          <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-6 h-fit">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-sm bg-white/70" />
                <span className="text-[13px] text-white/85 font-medium">Inspector</span>
              </div>
              <span className="text-[10px] text-white/30 font-mono">⌘ I</span>
            </div>

            <div className="space-y-6">
              {/* Component */}
              <PropertyGroup label="Component" value="ProfileCard.tsx" />

              {/* Typography */}
              <div>
                <PropertyGroup label="Typography" />
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => setTypeSize(opt.value)}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-mono transition-all ${
                        typeSize === opt.value
                          ? "bg-white text-black"
                          : "border border-white/[0.08] text-white/60 hover:border-white/20"
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <PropertyGroup label="Color" />
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-md border border-white/[0.1]"
                    style={{ background: color }}
                  />
                  <div className="font-mono text-[11px] text-white/60 uppercase">
                    {color}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`h-7 w-7 rounded-full border transition-all ${
                        color === c.value
                          ? "border-white ring-2 ring-white/20 ring-offset-2 ring-offset-black"
                          : "border-white/[0.1] hover:border-white/30"
                      }`}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Spacing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <PropertyGroup label="Spacing" inline />
                  <span className="text-[11px] text-white/60 font-mono">{spacing}px</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={32}
                  value={spacing}
                  onChange={(e) => setSpacing(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-white"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${((spacing - 8) / 24) * 100}%, rgba(255,255,255,0.08) ${((spacing - 8) / 24) * 100}%, rgba(255,255,255,0.08) 100%)`,
                  }}
                />
              </div>

              {/* Radius */}
              <div>
                <PropertyGroup label="Radius" />
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {radiusOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => setRadius(opt.value)}
                      className={`px-2 py-1.5 text-[11px] font-medium transition-all ${
                        radius === opt.value
                          ? "bg-white text-black rounded-md"
                          : "border border-white/[0.08] text-white/60 hover:border-white/20 rounded-md"
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadow */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <PropertyGroup label="Shadow" inline />
                  <span className="text-[11px] text-white/60 font-mono">
                    {Math.round(shadow * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={shadow}
                  onChange={(e) => setShadow(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${shadow * 100}%, rgba(255,255,255,0.08) ${shadow * 100}%, rgba(255,255,255,0.08) 100%)`,
                  }}
                />
              </div>

              {/* Layout */}
              <PropertyGroup label="Layout" value="Stack · Vertical" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PropertyGroup({
  label,
  value,
  inline,
}: {
  label: string;
  value?: string;
  inline?: boolean;
}) {
  if (inline) {
    return <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono">{label}</div>;
  }
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono">
        {label}
      </div>
      {value && (
        <div className="text-[11px] text-white/70 font-mono">{value}</div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}