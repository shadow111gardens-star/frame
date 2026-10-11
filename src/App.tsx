import {useAuth} from "./auth/AuthProvider";
import {protectedRoute} from "./auth/store";
import { useEffect, useState } from "react";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { LogoMarquee } from "./components/LogoMarquee";
import { Workflow } from "./components/Workflow";
import { Features } from "./components/Features";
import { Inspector } from "./components/Inspector";
import { Developer } from "./components/Developer";
import { Pricing } from "./components/Pricing";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { WorkspaceProvider } from "./workspace/store";
import { WorkspaceLayout } from "./workspace/WorkspaceLayout";
import { HomeLayout } from "./home/HomeLayout";

// Inner pages
import { About } from "./components/pages/About";
import { Blog } from "./components/pages/Blog";
import { BlogPost } from "./components/pages/BlogPost";
import { Contact } from "./components/pages/Contact";
import { Careers } from "./components/pages/Careers";
import { Templates } from "./components/pages/Templates";
import { Showcase } from "./components/pages/Showcase";
import { Community } from "./components/pages/Community";
import { Docs } from "./components/pages/Docs";
import { Changelog } from "./components/pages/Changelog";
import { Roadmap } from "./components/pages/Roadmap";
import { Security } from "./components/pages/Security";
import { Cookies } from "./components/pages/Cookies";
import { Privacy } from "./components/pages/Privacy";
import { Terms } from "./components/pages/Terms";
import { Features as FeaturesPage } from "./components/pages/Features";

type Route =
  | "landing"
  | "home"
  | "workspace"
  | "about"
  | "blog"
  | "blog-post"
  | "contact"
  | "careers"
  | "templates"
  | "showcase"
  | "community"
  | "docs"
  | "changelog"
  | "roadmap"
  | "security"
  | "cookies"
  | "privacy"
  | "terms"
  | "features"
  | "pricing"
  | "not-found";

interface Resolved {
  route: Route;
  param?: string;
}

function resolveRoute(): Resolved {
  if (typeof window === "undefined") return { route: "landing" };
  const h = window.location.hash;

  if (h === "#workspace") return { route: "workspace" };
  if (h === "#home") return { route: "home" };

  if (h === "#about") return { route: "about" };
  if (h === "#blog") return { route: "blog" };
  if (h.startsWith("#blog/")) return { route: "blog-post", param: h.slice(6) };
  if (h === "#contact") return { route: "contact" };
  if (h === "#careers") return { route: "careers" };
  if (h === "#templates") return { route: "templates" };
  if (h === "#showcase") return { route: "showcase" };
  if (h === "#community") return { route: "community" };
  if (h === "#docs") return { route: "docs" };
  if (h === "#changelog") return { route: "changelog" };
  if (h === "#roadmap") return { route: "roadmap" };
  if (h === "#security") return { route: "security" };
  if (h === "#cookies") return { route: "cookies" };
  if (h === "#privacy") return { route: "privacy" };
  if (h === "#terms") return { route: "terms" };
  if (h === "#features") return { route: "features" };
  if (h === "#pricing") return { route: "pricing" };

  return { route: "landing" };
}

export default function App() {
  const auth=useAuth();
  const [resolved, setResolved] = useState<Resolved>(resolveRoute());

  useEffect(() => {
    const onHashChange = () => {
      const next = resolveRoute();
      setResolved(next);
      // Scroll to top on every navigation, but not for the workspace
      // (the workspace manages its own scroll).
      if (next.route !== "workspace") {
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(()=>{
    if(protectedRoute(resolved.route)&&auth.status==='unauthenticated'){
      auth.remember(resolved.route==='home'?'#home':'#workspace');
      window.location.hash='';
    }
  },[resolved.route,auth.status]);
  if(protectedRoute(resolved.route)&&auth.status==='loading')return <div role="status" className="min-h-screen grid place-items-center bg-[#050507] text-white/65">Restoring your session?</div>;
  if(protectedRoute(resolved.route)&&auth.status!=='authenticated')return <div className="min-h-screen bg-[#050507] text-white"><Nav /><Hero /></div>;

  // Workspace — full-screen, no global chrome
  if (resolved.route === "workspace") {
    return (
      <WorkspaceProvider>
        <WorkspaceLayout />
      </WorkspaceProvider>
    );
  }

  // Home — full-screen, no global chrome
  if (resolved.route === "home") {
    return <HomeLayout />;
  }

  // Landing
  if (resolved.route === "landing") {
    return (
      <div className="relative min-h-screen bg-[#050507] text-white overflow-x-hidden">
        <div className="fixed inset-0 -z-50 grain opacity-[0.02] pointer-events-none" />
        <Nav />
        <main>
          <Hero />
          <LogoMarquee />
          <Workflow />
          <Features />
          <Inspector />
          <Developer />
          <Pricing />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    );
  }

  // 404 — fall back to landing
  if (resolved.route === "not-found") {
    return <NotFound />;
  }

  // Inner pages — share chrome
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {renderInner(resolved)}
    </div>
  );
}

function renderInner(r: Resolved) {
  switch (r.route) {
    case "about":
      return <About />;
    case "blog":
      return <Blog />;
    case "blog-post":
      return <BlogPost slug={r.param ?? ""} />;
    case "contact":
      return <Contact />;
    case "careers":
      return <Careers />;
    case "templates":
      return <Templates />;
    case "showcase":
      return <Showcase />;
    case "community":
      return <Community />;
    case "docs":
      return <Docs />;
    case "changelog":
      return <Changelog />;
    case "roadmap":
      return <Roadmap />;
    case "security":
      return <Security />;
    case "cookies":
      return <Cookies />;
    case "privacy":
      return <Privacy />;
    case "terms":
      return <Terms />;
    case "features":
      return <FeaturesPage />;
    case "pricing":
      return <InnerPricing />;
    default:
      return <NotFound />;
  }
}

function InnerPricing() {
  // The landing-page Pricing component is the source of truth — render it
  // here in the same chrome as other pages.
  return (
    <div className="relative min-h-screen">
      <Nav />
      <main className="relative pt-12">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-20 text-center bg-[#050507]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono mb-3">
          404
        </div>
        <h1 className="text-[clamp(2rem,4vw,3rem)] text-silver-shine tracking-[-0.03em] mb-3">
          Page not found.
        </h1>
        <p className="text-[15px] text-white/55 max-w-md mb-6">
          The link you followed may be broken, or the page may have been
          moved.
        </p>
        <a href="#" className="btn-primary px-5 py-2.5 text-[12.5px] inline-block">
          Go home
        </a>
      </div>
    </div>
  );
}
