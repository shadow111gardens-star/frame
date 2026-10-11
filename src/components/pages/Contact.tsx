import { useState } from "react";
import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const CHANNELS = [
  {
    title: "General",
    email: "hello@frame.studio",
    desc: "Questions, partnerships, press inquiries.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    title: "Support",
    email: "support@frame.studio",
    desc: "Help with your account, bugs, and feature requests.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: "Press",
    email: "press@frame.studio",
    desc: "Media inquiries, brand assets, interviews.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l3-3h12l3 3v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
      </svg>
    ),
  },
  {
    title: "Careers",
    email: "careers@frame.studio",
    desc: "Join the team. Tell us what you'd love to work on.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "General", message: "" });
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: "", email: "", subject: "General", message: "" });
    }, 2500);
  };

  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Contact"
          title="Get in touch."
          italic="We'd love to hear from you."
          description="Questions, support, press, or a friendly hello — every message is read by a real human on the FRAME team within 24 hours."
        />
      }
    >
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
          {/* Channels */}
          <div>
            <h2 className="text-[18px] text-silver-shine tracking-[-0.02em] font-medium mb-5">
              Channels
            </h2>
            <div className="space-y-2.5">
              {CHANNELS.map((c) => (
                <a
                  key={c.email}
                  href={`mailto:${c.email}`}
                  className="group flex items-start gap-3.5 p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
                >
                  <div className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] grid place-items-center text-white/65 group-hover:text-white transition-colors flex-shrink-0">
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-white font-medium">{c.title}</div>
                    <div className="text-[12px] text-white/55 group-hover:text-white transition-colors font-mono">
                      {c.email}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">{c.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-8 p-5 rounded-xl border border-white/[0.06] bg-white/[0.015]">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-2">
                Headquarters
              </div>
              <div className="text-[13.5px] text-white/85 leading-relaxed">
                FRAME Studio Inc.
                <br />
                1050 Sansome Street, Floor 3
                <br />
                San Francisco, CA 94111
                <br />
                <span className="text-white/45">Berlin · Singapore · remote globally</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="text-[18px] text-silver-shine tracking-[-0.02em] font-medium mb-5">
              Send us a message
            </h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
              </div>
              <div>
                <label className="text-[11px] text-white/45 uppercase tracking-widest font-mono mb-1.5 block">
                  Subject
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["General", "Support", "Press", "Partnership"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, subject: s })}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                        form.subject === s
                          ? "bg-white text-black border-white"
                          : "border-white/[0.08] text-white/65 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/45 uppercase tracking-widest font-mono mb-1.5 block">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={6}
                  placeholder="Tell us what you're working on, what you need help with, or just say hi."
                  className="ws-input w-full px-3.5 py-3 text-[13.5px] resize-none focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!form.name || !form.email || !form.message || sent}
                className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-30 inline-flex items-center gap-2"
              >
                {sent ? "Message sent ✓" : "Send message"}
                {!sent && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-white/45 uppercase tracking-widest font-mono mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ws-input w-full px-3.5 py-2.5 text-[13.5px] focus:outline-none"
      />
    </div>
  );
}
