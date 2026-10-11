import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using FRAME, you agree to be bound by these Terms. If you do not agree, do not use the service. We may update these terms from time to time; continued use constitutes acceptance of the updated terms.",
  },
  {
    title: "2. Your account",
    body: "You are responsible for your account credentials and for all activity under your account. You must provide a valid email address. You may not use FRAME to violate any applicable law or to infringe on the rights of others.",
  },
  {
    title: "3. Plans and payment",
    body: "FRAME offers free and paid plans. Paid plans are billed monthly or annually. You can change or cancel your plan at any time. Refunds are issued within 14 days of purchase on a prorated basis.",
  },
  {
    title: "4. Your content",
    body: "You retain all rights to your prompts, designs, and generated code. By using FRAME, you grant us a limited license to process your content for the purpose of providing the service. We never claim ownership of your work.",
  },
  {
    title: "5. Our intellectual property",
    body: "FRAME, the FRAME logo, the product interface, and our underlying technology are protected by intellectual property laws. You may not copy, modify, or reverse-engineer the service, except as permitted by law.",
  },
  {
    title: "6. AI-generated content",
    body: "FRAME uses AI to generate code, designs, and copy. AI-generated content is provided as-is. You are responsible for reviewing and validating any AI-generated content before using it in production. We do not warrant the accuracy, completeness, or fitness of AI-generated content.",
  },
  {
    title: "7. Prohibited use",
    body: "You may not: (a) use FRAME to generate illegal, harmful, or offensive content; (b) attempt to reverse-engineer, decompile, or hack the service; (c) use FRAME to train competing AI models; (d) attempt to access other users' projects without authorization.",
  },
  {
    title: "8. Termination",
    body: "We may suspend or terminate your account if you violate these terms. You may terminate your account at any time from Settings. Upon termination, your data will be deleted within 30 days, except where retention is required by law.",
  },
  {
    title: "9. Disclaimers and limitations",
    body: "FRAME is provided 'as is' without warranties of any kind. To the maximum extent permitted by law, our total liability is limited to the amount you paid us in the past 12 months. We are not liable for indirect, incidental, or consequential damages.",
  },
  {
    title: "10. Governing law",
    body: "These terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes will be resolved in the courts of San Francisco County.",
  },
  {
    title: "11. Contact",
    body: "Questions about these terms? Email legal@frame.studio. We respond to all legal inquiries within 5 business days.",
  },
];

export function Terms() {
  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Terms of service"
          title="The rules."
          italic="Plain English."
          description="We've tried to keep these terms as short and readable as possible. If anything is unclear, email us — we'd rather explain it than hide it in legalese."
        />
      }
    >
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-[18px] text-silver-shine tracking-[-0.02em] font-medium mb-3">
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
