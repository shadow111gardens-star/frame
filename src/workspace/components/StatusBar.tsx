import { previewConfig, screenDimensions } from "../../../shared/product";
import { useEffect, useState } from "react";
import { useWorkspace, getDevice } from "../store";

export function StatusBar() {
  const { state, dispatch } = useWorkspace();
  const currentScreen = state.screens.find((s) => s.id === state.currentScreen);
  const device = getDevice(state.device);
  const config=previewConfig(state.productType);
  const dimensions=state.centerTab==='prototype'?{width:device.width,height:device.height}:screenDimensions(currentScreen??{},state.productType);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (state.saveState === "saving") {
      setJustSaved(false);
    } else if (state.saveState === "saved") {
      const t = setTimeout(() => setJustSaved(true), 100);
      return () => clearTimeout(t);
    }
  }, [state.saveState, state.lastSavedAt]);

  return (
    <footer className="h-7 px-3 border-t border-white/[0.06] bg-[#0A0A0D] flex items-center justify-between text-[10.5px] text-white/40 font-mono">
      <div className="flex items-center gap-2">
        {state.saveState === "saving" ? (
          <button
            onClick={() => dispatch({ type: "RETRY_SAVE" })}
            className="flex items-center gap-2 hover:text-white/60 transition-colors"
            title="Click to retry save"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/60 opacity-50 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <span>Saving changes…</span>
          </button>
        ) : state.saveState === "failed" ? (
          <button
            onClick={() => dispatch({ type: "RETRY_SAVE" })}
            className="flex items-center gap-2 hover:text-white/60 transition-colors"
            title="Save failed — click to retry"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
            </span>
            <span className="text-red-300/80">Save failed</span>
            <span className="text-white/30">·</span>
            <span className="text-white/50 underline-offset-2 hover:underline">Retry</span>
          </button>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span>{state.designSystem ? "Changes kept in this session" : "No design generated"}</span>
            {justSaved && <span className="text-white/25">· just now</span>}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span>
          {state.productType==="website"?"Browser":device.label} · {dimensions.width} × {dimensions.height}
        </span>
        <span className="text-white/20">·</span>
        <span>{currentScreen?.label ?? "No screen"}</span>
      </div>

      <div className="flex items-center gap-3">
        <span>{state.productType?config.label:"No product type"}</span>
        <span className="text-white/20">·</span>
        <span>{state.productType==="website"?"Web":state.productType?"Mobile":""}</span>
        <span className="text-white/20">·</span>
        <span>TypeScript</span>
      </div>
    </footer>
  );
}
