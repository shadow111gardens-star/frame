import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const SECTIONS = [
  {
    title: "Information we collect",
    body: "We collect the minimum data necessary to provide FRAME. This includes: account information (email, display name), your projects and chat history, and basic usage analytics (page views, feature usage). We do not collect sensitive personal data.",
  },
  {
    title: "How we use your information",
    body: "We use your information to: provide and improve the FRAME product, authenticate you, store your projects, respond to support requests, and send service-critical notifications. We do not use your prompts or designs to train AI models.",
  },
  {
    title: "AI and your content",
    body: "Your prompts, designs, and generated code are private by default. They are processed by our AI to generate responses, then stored in your project. They are never used to train models, never shared with other users, and never sold to third parties.",
  },
  {
    title: "Data storage and location",
    body: "Your data is stored on AWS in eu-central-1 (Frankfurt) and us-east-1 (N. Virginia), with full replication. You can choose your preferred region in Settings. Backups are encrypted and retained for 30 days.",
  },
  {
    title: "Sharing your data",
    body: "We share your data only with the sub-processors necessary to run FRAME (listed in our DPA). We do not sell, rent, or trade your data. We do not share with advertisers. We respond to legal requests only when compelled by valid law.",
  },
  {
    title: "Your rights",
    body: "You can access, export, or delete your data at any time. Use the Settings menu to download all your data as JSON. Email privacy@frame.studio to request deletion. We respond within 7 days.",
  },
  {
    title: "Data retention",
    body: "We retain your data for as long as your account is active. If you delete your account, we delete your personal data within 30 days. Anonymized usage analytics may be retained indefinitely.",
  },
  {
    title: "Children's privacy",
    body: "FRAME is not intended for children under 16. We do not knowingly collect data from children. If you believe a child has created an account, please contact us at privacy@frame.studio.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this privacy policy from time to time. We will notify you of material changes via email at least 30 days before they take effect. The latest version is always at frame.studio/privacy.",
  },
  {
    title: "Contact",
    body: "Questions? Email privacy@frame.studio. We have a Data Protection Officer (DPO) who handles all privacy requests. EU residents can also contact our EU representative.",
  },
];

export function Privacy() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Privacy policy"
          title="Your work is private."
          italic="And we'll keep it that way."
          description="FRAME is built around a simple principle: your projects belong to you. We don't train on them, we don't share them, we don't sell them. Here's the full policy."
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
              <p className="text-[14.5px] text-white/65 leading-[1.75]">
                {s.body}
              </p>
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
