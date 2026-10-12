import {AuthButton} from "../auth/AuthProvider";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function FinalCTA() {
  return (
    <section className="relative py-40 overflow-hidden">
      {/* Background atmosphere */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[700px] -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(106,138,255,0.18) 0%, rgba(80,100,180,0.08) 30%, transparent 65%)",
          filter: "blur(80px)",
        }}
      />
      <div className="grain" />

      <div className="max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="h-px w-10 bg-white/30 shimmer-line" />
            <span className="text-[11.5px] uppercase tracking-[0.3em] text-white/50 font-mono">
              The next chapter
            </span>
            <span className="h-px w-10 bg-white/30 shimmer-line" />
          </div>

          <h2
            className="font-sans font-medium tracking-[-0.04em] text-silver-shine leading-[0.95]"
            style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)" }}
          >
            <span className="block">Your next app</span>
            <span className="block italic font-serif font-light">starts with an idea.</span>
          </h2>

          <p className="mt-8 text-[16px] sm:text-[17px] text-white/55 max-w-xl mx-auto">
            Describe it. Design it. Build it.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AuthButton
              className="btn-primary px-7 py-3.5 text-[14.5px] inline-flex items-center gap-2.5"
            >
              Start Designing
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </AuthButton>
            <a
              href="#"
              className="text-white/60 hover:text-white px-4 py-3 text-[13.5px] transition-colors inline-flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-2.07c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 015.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.05.78 2.12v3.14c0 .3.21.67.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}