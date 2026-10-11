import { useEffect, useState } from "react";
import { useWorkspace } from "./store";
import { TopBar } from "./components/TopBar";
import { ChatPanel } from "./components/ChatPanel";
import { CanvasArea } from "./components/CanvasArea";
import { InspectorPanel } from "./components/InspectorPanel";
import { StatusBar } from "./components/StatusBar";

type MobileView = "chat" | "canvas" | "inspector";

function KeyboardShortcuts() {
  const { state, dispatch, canUndo, canRedo } = useWorkspace();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(state.modal.type!=="none")return;
      const target = e.target as HTMLElement;
      const inFormField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      const ctrl = e.metaKey || e.ctrlKey;
      if (!ctrl) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (inFormField) return;
        e.preventDefault();
        if (canUndo) dispatch({ type: "UNDO" });
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        if (inFormField) return;
        e.preventDefault();
        if (canRedo) dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, canUndo, canRedo, state.modal.type]);
  return null;
}

export function WorkspaceLayout(){const {state}=useWorkspace();return <WorkspaceEditor key={state.projectId}/>;}

function WorkspaceEditor() {
  const [mobileView, setMobileView] = useState<MobileView>("canvas");

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050507] text-white overflow-hidden">
      <KeyboardShortcuts />
      <TopBar />

      {/* Mobile view tabs */}
      <div className="md:hidden flex items-center border-b border-white/[0.06] bg-[#0A0A0D] px-2 py-1.5 gap-1">
        {(["chat", "canvas", "inspector"] as MobileView[]).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`flex-1 h-7 text-[11px] rounded-md transition-all ${
              mobileView === v
                ? "bg-white text-black"
                : "text-white/55 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {v === "chat" ? "Chat" : v === "canvas" ? "Preview" : "Inspector"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Chat */}
        <div className="hidden md:block w-[320px] flex-shrink-0">
          <ChatPanel />
        </div>
        <div className="md:hidden flex-1 min-w-0">
          {mobileView === "chat" && <ChatPanel />}
        </div>

        {/* Center: Canvas */}
        <div
          className={`flex-1 min-w-0 ${mobileView === "canvas" ? "" : "hidden md:flex"}`}
        >
          <CanvasArea />
        </div>

        {/* Right: Inspector */}
        <div className="hidden md:block w-[300px] flex-shrink-0">
          <InspectorPanel />
        </div>

        <div className="md:hidden flex-1 min-w-0">
          {mobileView === "inspector" && <InspectorPanel />}
        </div>
      </div>

      <StatusBar />
    </div>
  );
}