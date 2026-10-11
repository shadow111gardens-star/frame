import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const PILLARS = [
  {
    title: "Encryption everywhere",
    desc: "All data in transit uses TLS 1.3. All data at rest uses AES-256. We don't store API keys in plaintext — they live in a hardened vault.",
    icon: "🔒",
  },
  {
    title: "Single sign-on (SSO)",
    desc: "SAML 2.0 and OIDC support on Studio and Team plans. SCIM provisioning for user lifecycle management. Available on Pro and above.",
    icon: "🪪",
  },
  {
    title: "Granular access control",
    desc: "Role-based access: Owner, Editor, Commenter, Viewer. Audit logs for every project. IP allowlisting for enterprise teams.",
    icon: "👥",
  },
  {
    title: "SOC 2 Type II",
    desc: "Annual SOC 2 Type II audit. The report is available under NDA to Studio and Team customers. We're a security-first team.",
    icon: "🛡",
  },
  {
    title: "GDPR & CCPA",
    desc: "Full data portability. Right to erasure. Data processing addendum available. We don't sell or share your project data, ever.",
    icon: "🇪🇺",
  },
  {
    title: "Private by default",
    desc: "Your prompts and designs are never used to train AI models. Your code is yours. We don't share with third parties.",
    icon: "🔐",
  },
];

const PRACTICES = [
  ["Infrastructure", "AWS · Frankfurt (eu-central-1) and N. Virginia (us-east-1) with full replication"],
  ["Uptime", "99.9% SLA with status page at status.frame.studio"],
  ["Backups", "Hourly snapshots, daily backups, 30-day retention"],
  ["Penetration testing", "Annual third-party pen test by Trail of Bits"],
  ["Bug bounty", "Active program via HackerOne — minimum $500 per valid report"],
  ["Sub-processors", "Listed in our public DPA, updated within 30 days of any change"],
];

export function Security() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Security"
          title="Your work is yours."
          italic="We protect it like our own."
          description="FRAME is built for teams who care about security. We are too. Here's how we keep your projects, files, and chat history safe."
        />
      }
    >
      {/* Pillars */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-6"
            >
              <div className="text-[20px] mb-3">{p.icon}</div>
              <h3 className="text-[15px] text-white font-medium mb-2">{p.title}</h3>
              <p className="text-[12.5px] text-white/55 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Practices */}
      <section className="py-12 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-mono mb-6">
            Operational practices
          </div>
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {PRACTICES.map(([k, v], i) => (
              <div
                key={k}
                className={`grid grid-cols-[140px_1fr] items-start px-5 py-4 ${
                  i !== PRACTICES.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono pt-0.5">
                  {k}
                </div>
                <div className="text-[13.5px] text-white/85">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 border-t border-white/[0.06] text-center">
        <div className="max-w-md mx-auto px-6">
          <h3 className="text-[20px] text-silver-shine tracking-[-0.02em] mb-2">
            Report a security issue.
          </h3>
          <p className="text-[13px] text-white/55 mb-5">
            We respond to all security reports within 24 hours.
          </p>
          <a
            href="mailto:security@frame.studio"
            className="text-[13px] text-white border border-white/[0.15] rounded-full px-4 py-2 hover:bg-white/[0.04] transition-colors"
          >
            security@frame.studio
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
