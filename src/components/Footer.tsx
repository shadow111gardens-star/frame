interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  items: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#changelog" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documentation", href: "#docs" },
      { label: "Templates", href: "#templates" },
      { label: "Showcase", href: "#showcase" },
      { label: "Community", href: "#community" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Terms", href: "#terms" },
      { label: "Privacy", href: "#privacy" },
      { label: "Security", href: "#security" },
      { label: "Cookies", href: "#cookies" },
    ],
  },
];

const SOCIAL = [
  {
    name: "GitHub",
    href: "https://github.com/frame-studio",
  },
  {
    name: "Twitter",
    href: "https://twitter.com/frame",
  },
  {
    name: "Discord",
    href: "https://discord.gg/frame",
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] mt-10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-2.5 mb-4 w-fit"
            >
              <div className="relative h-7 w-7 grid place-items-center">
                <div className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-white/90 to-white/30" />
                <div className="absolute inset-[1.5px] rounded-[6.5px] bg-black" />
                <div className="relative h-3 w-3 rounded-[3px] border border-white/70" />
              </div>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                FRAME
              </span>
            </a>
            <p className="text-[12.5px] text-white/45 leading-relaxed max-w-xs">
              Design mobile apps with AI. Turn ideas into beautiful, editable
              interfaces, ready for production.
            </p>
            <div className="flex items-center gap-2 mt-5">
              {SOCIAL.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2.5 py-1 rounded-md text-[11px] text-white/55 hover:text-white border border-white/[0.06] hover:border-white/[0.15] transition-all"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono mb-4">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-[13px] text-white/65 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-white/35">
            © 2026 Frame Studio Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-5 text-[11.5px] text-white/40">
            <a
              href="#terms"
              className="hover:text-white/65 transition-colors"
            >
              Terms
            </a>
            <a
              href="#privacy"
              className="hover:text-white/65 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#cookies"
              className="hover:text-white/65 transition-colors"
            >
              Cookies
            </a>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
