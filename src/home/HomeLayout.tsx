import { AnimatePresence } from "framer-motion";
import { useHome, HomeProvider } from "./store";
import { Sidebar } from "./components/Sidebar";
import { CenterStage } from "./components/CenterStage";
import { SettingsModal } from "./components/SettingsModal";
import { LogoutConfirm } from "./components/LogoutConfirm";
import {
  TemplatesModal,
  ImportModal,
  CreditsBillingModal,
} from "./components/SecondaryModals";

export function HomeLayout() {
  return (
    <HomeProvider>
      <Shell />
    </HomeProvider>
  );
}

function Shell() {
  const { state, dispatch } = useHome();
  return (
    <div className="h-screen w-screen flex bg-[#050507] text-white overflow-hidden relative">
      <Sidebar />

      <button
        onClick={() => dispatch({ type: "SET_MOBILE_SIDEBAR", open: true })}
        className="md:hidden fixed top-3 left-3 z-30 h-9 w-9 grid place-items-center rounded-lg bg-[#0A0A0D]/80 backdrop-blur border border-white/[0.08]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <CenterStage />

      {/* Mobile sidebar backdrop */}
      {state.mobileSidebarOpen && (
        <div
          onClick={() => dispatch({ type: "SET_MOBILE_SIDEBAR", open: false })}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
        />
      )}

      {/* All modals */}
      <AnimatePresence>
        {state.modal.type === "settings" && <SettingsModal />}
        {state.modal.type === "logout" && <LogoutConfirm />}
        {state.modal.type === "templates" && <TemplatesModal />}
        {state.modal.type === "import" && <ImportModal />}
        {state.modal.type === "credits-billing" && <CreditsBillingModal />}
      </AnimatePresence>
    </div>
  );
}