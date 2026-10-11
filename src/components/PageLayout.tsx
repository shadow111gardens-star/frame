import { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
  /** Show a wide hero band at the top of the page */
  hero?: ReactNode;
  /** No padding between header and content (for full-bleed heroes) */
  flush?: boolean;
}

export function PageLayout({ children, hero, flush }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <Nav />
      {hero && flush ? hero : null}
      {!flush && (
        <main className="relative pt-24">
          {hero}
          {children}
        </main>
      )}
      {flush && (
        <main className="relative">
          {hero}
          {children}
        </main>
      )}
      <Footer />
    </div>
  );
}
