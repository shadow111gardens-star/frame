import {AuthLink} from "../../auth/AuthProvider";
import { useState } from "react";
import { PageLayout } from "../PageLayout";
import { PageHero } from "./PageHero";

interface Template {
  id: string;
  name: string;
  category: string;
  desc: string;
  icon: string;
  screens: number;
  popular?: boolean;
  /** Visual "preview" — gradient stops + accent */
  palette: [string, string];
}

const TEMPLATES: Template[] = [
  { id: "fitness", name: "Fitness Tracker", category: "Health & Fitness", desc: "Activity rings, workout cards, weekly progress.", icon: "◇", screens: 6, popular: true, palette: ["#7AA2FF", "#0A0A0D"] },
  { id: "finance", name: "Personal Finance", category: "Finance", desc: "Budgets, transactions, spending insights.", icon: "◆", screens: 7, popular: true, palette: ["#9ED7C0", "#0A0A0D"] },
  { id: "ecommerce", name: "Boutique Store", category: "Commerce", desc: "Product catalog, cart, checkout, order tracking.", icon: "○", screens: 8, popular: true, palette: ["#E8C77E", "#0A0A0D"] },
  { id: "social", name: "Social Feed", category: "Social", desc: "Profile, feed, stories, direct messages.", icon: "△", screens: 9, popular: true, palette: ["#C5B6FF", "#0A0A0D"] },
  { id: "travel", name: "Travel Planner", category: "Travel", desc: "Itineraries, bookings, offline maps.", icon: "□", screens: 6, palette: ["#9CC7E8", "#0A0A0D"] },
  { id: "wellness", name: "Wellness & Meditation", category: "Health & Fitness", desc: "Sessions, streaks, mood tracking.", icon: "▷", screens: 5, palette: ["#A8B5C0", "#0A0A0D"] },
  { id: "habit", name: "Habit Tracker", category: "Productivity", desc: "Daily streaks, reminders, statistics.", icon: "⬡", screens: 4, palette: ["#E89494", "#0A0A0D"] },
  { id: "notes", name: "Notes & Docs", category: "Productivity", desc: "Markdown, folders, sharing, search.", icon: "▤", screens: 5, palette: ["#BFBFBF", "#0A0A0D"] },
  { id: "music", name: "Music Player", category: "Media", desc: "Library, now playing, playlists, queue.", icon: "♫", screens: 6, palette: ["#C5B6FF", "#0A0A0D"] },
  { id: "delivery", name: "Food Delivery", category: "Commerce", desc: "Restaurants, menu, cart, tracking.", icon: "◈", screens: 7, palette: ["#E8C77E", "#0A0A0D"] },
  { id: "booking", name: "Booking & Reservations", category: "Commerce", desc: "Search, availability, confirmation.", icon: "◐", screens: 6, palette: ["#7AA2FF", "#0A0A0D"] },
  { id: "news", name: "News Reader", category: "Media", desc: "Personalized feed, bookmarks, offline.", icon: "◢", screens: 5, palette: ["#9ED7C0", "#0A0A0D"] },
];

const CATEGORIES = ["All", "Health & Fitness", "Finance", "Commerce", "Social", "Productivity", "Media", "Travel"];

export function Templates() {
  const [category, setCategory] = useState("All");
  const filtered =
    category === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  return (
    <PageLayout
      hero={
        <PageHero
          eyebrow="Templates"
          title="Start from"
          italic="a polished beginning."
          description="Production-grade mobile app templates. Pick one, customize it with AI, ship a real app this afternoon."
        />
      }
    >
      <section className="pb-8 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1.5 overflow-x-auto ws-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-all ${
                category === c
                  ? "bg-white text-black"
                  : "text-white/55 hover:text-white border border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function TemplateCard({ t }: { t: Template }) {
  return (
    <AuthLink
      href="#home"
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] p-5 transition-all"
    >
      <div
        className="rounded-xl border border-white/[0.06] aspect-[16/10] mb-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${t.palette[0]}22 0%, ${t.palette[1]} 100%)`,
        }}
      >
        <div className="absolute inset-0 flex flex-col p-4 justify-between">
          <div className="flex items-center justify-between">
            <div
              className="h-6 w-6 rounded-md grid place-items-center text-[10px] font-semibold"
              style={{
                background: `${t.palette[0]}33`,
                color: t.palette[0],
                border: `1px solid ${t.palette[0]}55`,
              }}
            >
              {t.icon}
            </div>
            {t.popular && (
              <span className="text-[9px] uppercase tracking-widest font-mono text-white/45 border border-white/[0.1] rounded-full px-1.5 py-0.5">
                Popular
              </span>
            )}
          </div>
          <div className="flex items-end gap-1 h-12">
            {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${t.palette[0]} 0%, ${t.palette[0]}33 100%)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-[15px] text-white font-medium group-hover:text-silver-shine transition-colors">
          {t.name}
        </h3>
        <span className="text-[10.5px] text-white/40 font-mono mt-1">
          {t.screens} screens
        </span>
      </div>
      <p className="text-[12.5px] text-white/50 leading-relaxed line-clamp-2 mb-3">
        {t.desc}
      </p>
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <span className="text-[10.5px] text-white/40 uppercase tracking-widest font-mono">
          {t.category}
        </span>
        <span className="text-[11px] text-white/65 group-hover:text-white transition-colors inline-flex items-center gap-1">
          Use template
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </AuthLink>
  );
}
