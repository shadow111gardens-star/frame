import {AuthButton} from "../auth/AuthProvider";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it Works", href: "#workflow" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          scrolled
            ? "max-w-[1100px] px-3"
            : "max-w-[1280px] px-6"
        }`}
      >
        <nav
          className={`flex items-center justify-between rounded-full border border-white/[0.06] bg-black/40 backdrop-blur-xl px-5 py-2.5 transition-all duration-500 ${
            scrolled ? "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]" : ""
          }`}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="relative h-7 w-7 grid place-items-center">
              <div className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-white/90 to-white/30" />
              <div className="absolute inset-[1.5px] rounded-[6.5px] bg-black" />
              <div className="relative h-3 w-3 rounded-[3px] border border-white/70" />
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
              FRAME
            </span>
          </a>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-1.5 text-[13.5px] text-white/65 hover:text-white transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-2">
            <AuthButton
              className="hidden sm:inline-flex items-center text-[13.5px] text-white/60 hover:text-white transition-colors px-3"
            >
              Sign in
            </AuthButton>
            <AuthButton
              className="btn-primary px-4 py-2 text-[13px]"
            >
              Start Designing
            </AuthButton>
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="md:hidden ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-[3px]">
                <span className="block h-[1.5px] w-4 bg-white" />
                <span className="block h-[1.5px] w-4 bg-white" />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden mt-2 rounded-2xl border border-white/[0.06] bg-black/60 backdrop-blur-xl p-3"
            >
              <div className="flex flex-col">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-[14px] text-white/75 hover:text-white rounded-lg hover:bg-white/[0.03]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
