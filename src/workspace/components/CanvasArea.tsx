import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useWorkspace } from "../store";
import type { CenterTab } from "../types";
import { PrototypeView } from "./PrototypeView";
import { DesignSurface } from "./DesignSurface";
import { GenerationIndicator } from "./GenerationIndicator";

const TABS: { id: CenterTab; label: string }[] = [
  { id: "home", label: "Design" },
  { id: "prototype", label: "Prototype" },
];

export function CanvasArea() {
  const { state, dispatch } = useWorkspace();
  const [renamingScreenId, setRenamingScreenId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <section className="flex-1 h-full min-h-0 flex flex-col bg-[#08080B] min-w-0 relative">
      {/* Top canvas toolbar */}
      <div className="h-11 shrink-0 px-4 border-b border-white/[0.06] flex items-center gap-4 bg-[#0A0A0D]">
        {/* Screen tabs (left) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink overflow-x-auto ws-scrollbar">
          {state.screens.map((s) => {
            const active = state.currentScreen === s.id;
            return (
              <div key={s.id} className="relative group flex items-center flex-shrink-0">
                <button
                  onClick={() => dispatch({ type: "SELECT_SCREEN", id: s.id })}
                  onDoubleClick={() => {
                    setRenamingScreenId(s.id);
                    setRenameValue(s.label);
                  }}
                  className={`relative px-3 h-7 text-[12px] rounded-md transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-white/55 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {renamingScreenId === s.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        if (renameValue.trim()) {
                          dispatch({
                            type: "RENAME_SCREEN",
                            screenId: s.id,
                            label: renameValue.trim(),
                          });
                        }
                        setRenamingScreenId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (renameValue.trim()) {
                            dispatch({
                              type: "RENAME_SCREEN",
                              screenId: s.id,
                              label: renameValue.trim(),
                            });
                          }
                          setRenamingScreenId(null);
                        }
                        if (e.key === "Escape") setRenamingScreenId(null);
                      }}
                      className="bg-transparent text-white text-[12px] outline-none border-b border-white/30 w-[80px]"
                    />
                  ) : (
                    <span className="whitespace-nowrap">{s.label}</span>
                  )}
                  {active && !renamingScreenId && (
                    <motion.span
                      layoutId="screen-active"
                      className="absolute -bottom-px left-2 right-2 h-[2px] bg-white rounded-full"
                    />
                  )}
                </button>
                {state.screens.length > 1 && !renamingScreenId && (
                  <button
                    onClick={() => dispatch({ type: "DELETE_SCREEN", screenId: s.id })}
                    className="-ml-2 mr-1 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300 transition-all text-[11px] leading-none w-4 h-4 grid place-items-center rounded hover:bg-white/[0.05]"
                    title="Delete screen"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            className="px-2.5 h-7 text-[12px] text-white/45 hover:text-white border border-dashed border-white/[0.08] hover:border-white/[0.18] rounded-md transition-colors flex items-center gap-1.5 flex-shrink-0"
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: { type: "new-screen" } })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Screen
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-[16px]" />

        {/* Right: divider + mode tabs + zoom */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden lg:flex items-center bg-white/[0.02] border border-white/[0.06] rounded-md p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({ type: "SET_CENTER_TAB", tab: t.id })}
                className={`px-3 py-1 text-[11px] transition-all rounded ${
                  state.centerTab === t.id
                    ? "bg-white text-black"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center text-[11px] text-white/40 gap-1 px-2 py-0.5">
            <button
              onClick={() => dispatch({ type: "TOGGLE_FIT" })}
              className={`px-2 py-0.5 rounded hover:bg-white/[0.04] ${
                state.fit ? "text-white bg-white/[0.04]" : ""
              }`}
            >
              Fit
            </button>
            <button
              onClick={() => dispatch({ type: "SET_ZOOM", zoom: 100 })}
              className="px-2 py-0.5 rounded hover:bg-white/[0.04] font-mono"
            >
              {state.zoom}%
            </button>
            <div className="flex items-center bg-white/[0.02] border border-white/[0.06] rounded-md overflow-hidden">
              <button
                onClick={() =>
                  dispatch({ type: "SET_ZOOM", zoom: Math.max(50, state.zoom - 10) })
                }
                className="px-1.5 py-1 hover:bg-white/[0.04] transition-colors text-white/55 hover:text-white"
                title="Zoom out"
              >
                −
              </button>
              <span className="w-px h-3 bg-white/[0.06]" />
              <button
                onClick={() =>
                  dispatch({ type: "SET_ZOOM", zoom: Math.min(200, state.zoom + 10) })
                }
                className="px-1.5 py-1 hover:bg-white/[0.04] transition-colors text-white/55 hover:text-white"
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas body */}
      <div data-canvas-shell className="flex-1 min-h-0 relative overflow-hidden">
        <div className="absolute inset-0 ws-dot-bg opacity-60 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at center, rgba(106,138,255,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="relative h-full w-full min-h-0 p-8">
          {state.generating&&!state.designSystem?<GenerationIndicator/>:
          <AnimatePresence mode="wait">
            {state.centerTab === "prototype" ? (
              <motion.div
                className="w-full h-full"
                key="proto"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <PrototypeView zoom={state.fit ? "fit" : state.zoom} />
              </motion.div>
            ) : (
              <motion.div
                className="w-full h-full"
                key={state.currentScreen}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <DesignSurface zoom={state.fit ? "fit" : state.zoom} />
              </motion.div>
            )}
          </AnimatePresence>}
        </div>
        {state.generating&&state.designSystem&&<GenerationIndicator compact/>}
      </div>
    </section>
  );
}
