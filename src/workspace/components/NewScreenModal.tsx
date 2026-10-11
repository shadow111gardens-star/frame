import {Dialog} from './Dialog';
import { useState } from "react";
import { useWorkspace } from "../store";

const SUGGESTED = [
  "Settings",
  "Notifications",
  "Search",
  "Onboarding",
  "Paywall",
  "Profile",
  "Workouts",
];

export function NewScreenModal() {
  const { state, dispatch, generateDesign } = useWorkspace();
  const [name, setName] = useState("Settings");
  const [description, setDescription] = useState("");

  const create = () => {
    if(state.generating) return;
    const label=name.trim()||"New Screen";
    dispatch({type:"CLOSE_MODAL"});
    void generateDesign(`Add a ${label} screen. ${description}`,!!state.designSystem);
  };

  return (
    <Dialog title="New Screen" onClose={()=>dispatch({type:'CLOSE_MODAL'})} footer={        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
            className="btn-ghost px-4 py-2 text-[12px]"
          >
            Cancel
          </button>
          <button onClick={create} className="btn-primary px-4 py-2 text-[12px]">
            Create screen
          </button>
        </div>}>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-white/45 uppercase tracking-widest font-mono">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Settings"
              className="ws-input w-full mt-1.5 px-3 py-2 text-[13px]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => setName(s)}
                  className="ws-chip"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/45 uppercase tracking-widest font-mono">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="User settings and account preferences."
              className="ws-input w-full mt-1.5 px-3 py-2 text-[12.5px] resize-none"
            />
          </div>
          <div className="text-[10.5px] text-white/40 font-mono leading-relaxed">
            A new {name || "Screen"}.tsx file will be created in the screens/ directory.
          </div>
        </div>
    </Dialog>
  );
}
