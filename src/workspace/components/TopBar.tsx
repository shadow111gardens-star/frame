import {Dialog} from './Dialog';
import {useProjects} from '../../projects/ProjectsProvider';
import {NewProjectModal} from './NewProjectModal';
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../store";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectMenu } from "./ProjectMenu";
import { ExportModal } from "./ExportModal";
import { ShareModal } from "./ShareModal";
import { NewScreenModal } from "./NewScreenModal";
import { DeviceDropdown } from "./DeviceDropdown";

const IconBtn = ({
  children,
  label,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) => (
  <motion.button
    whileTap={disabled ? undefined : { scale: 0.97 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] transition-all ${
      primary
        ? "bg-white text-black hover:bg-white/90"
        : "text-white/55 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/55"
    }`}
    aria-label={label}
  >
    {children}
  </motion.button>
);

const IconOnly = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    whileTap={disabled ? undefined : { scale: 0.94 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className="h-7 w-7 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.04] disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/55 transition-all"
  >
    {label === "Undo" || label === "Redo" ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {label === "Undo" ? (
          <>
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 2.8L3 13" />
            <path d="M14 7l-1 4 4-1" />
          </>
        ) : (
          <>
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 2.8L21 13" />
            <path d="M10 7l1 4-4-1" />
          </>
        )}
      </svg>
    ) : label === "Share" ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    ) : label === "Export" ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5-5 5 5" />
        <path d="M12 15V5" />
      </svg>
    ) : label === "Plus" ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ) : null}
  </motion.button>
);

export function TopBar() {
  const { state, dispatch, canUndo, canRedo } = useWorkspace();
  const currentScreen = state.screens.find((s) => s.id === state.currentScreen);

  return (
    <header className="h-11 flex items-center border-b border-white/[0.06] bg-[#0A0A0D]/80 backdrop-blur-md sticky top-0 z-30 relative">
      {/* LEFT */}
      <div className="flex items-center gap-3 px-3 min-w-[280px]">
        <a
          href="#home"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Back to FRAME home"
        >
          <div className="relative h-5 w-5 grid place-items-center">
            <div className="absolute inset-0 rounded-[6px] bg-gradient-to-br from-white/90 to-white/30" />
            <div className="absolute inset-[1px] rounded-[5px] bg-black" />
            <div className="relative h-2 w-2 rounded-[2px] border border-white/70" />
          </div>
          <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-white">
            FRAME
          </span>
        </a>

        <div className="h-4 w-px bg-white/[0.08]" />

        <ProjectMenuButton />

        <SaveStatus />
      </div>

      {/* CENTER */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <path d="M12 18h.01" />
          </svg>
          <span className="text-[12px] text-white/80 font-medium">
            {currentScreen?.label ?? "No screen"}
          </span>
        </div>

        {/* Device dropdown */}
        <div className="hidden md:block">
          <DeviceDropdown />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-1 px-3">
        <div className="hidden md:flex items-center gap-1 text-[11px] text-white/40 mr-2">
          <button
            onClick={() => dispatch({ type: "TOGGLE_FIT" })}
            className={`px-1.5 py-0.5 rounded hover:bg-white/[0.04] ${
              state.fit ? "text-white" : ""
            }`}
          >
            Fit
          </button>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", zoom: 100 })}
            className="px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
          >
            {state.zoom}%
          </button>
          <button
            onClick={() =>
              dispatch({ type: "SET_ZOOM", zoom: Math.max(50, state.zoom - 10) })
            }
            className="px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={() =>
              dispatch({ type: "SET_ZOOM", zoom: Math.min(200, state.zoom + 10) })
            }
            className="px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
            title="Zoom in"
          >
            +
          </button>
        </div>

        <IconOnly
          label="Undo"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "UNDO" })}
        />
        <IconOnly
          label="Redo"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "REDO" })}
        />
        <div className="h-4 w-px bg-white/[0.06] mx-1" />
        <IconOnly
          label="Share"
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: { type: "share" } })}
        />
        <IconBtn
          label="Export"
          primary
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: { type: "export" } })}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5-5 5 5" />
            <path d="M12 15V5" />
          </svg>
          Export
        </IconBtn>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {state.modal.type === "rename-project" && (
          <RenameProjectModal />
        )}
        {state.modal.type === "export" && <ExportModal />}
        {state.modal.type === "new-project" && <NewProjectModal />}
        {state.modal.type === "share" && <ShareModal />}
        {state.modal.type === "new-screen" && <NewScreenModal />}
        {state.modal.type === "confirm-delete-project" && (
          <ConfirmDeleteProjectModal />
        )}
      </AnimatePresence>
    </header>
  );
}

function ProjectMenuButton() {
  const { state, dispatch } = useWorkspace();
  const open = state.modal.type === "project-menu" || state.modal.type === "rename-project" || state.modal.type === "confirm-delete-project";
  const ref = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Check if the click was inside the modal
        const target = e.target as HTMLElement;
        if (!target.closest("[data-modal]")) {
          dispatch({ type: "CLOSE_MODAL" });
        }
      }
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, dispatch]);

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={() =>
          dispatch({
            type: "OPEN_MODAL",
            modal: open ? { type: "none" } : { type: "project-menu" },
          })
        }
        className={`group flex items-center gap-1.5 px-2 py-1 hover:bg-white/[0.04] rounded-md transition-colors ${
          open ? "bg-white/[0.04]" : ""
        }`}
      >
        <span className="text-[12.5px] text-white/85 font-medium">
          {state.projectName || "Untitled project"}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/40 group-hover:text-white/60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {state.modal.type === "project-menu" && <ProjectMenu />}
      </AnimatePresence>
    </div>
  );
}

function RenameProjectModal() {
  const { state, dispatch } = useWorkspace();
  const [name, setName] = useState(state.projectName);
  return (
    <ModalShell onClose={() => dispatch({ type: "CLOSE_MODAL" })} title="Rename project">
      <div className="space-y-3">
        <label className="text-[11px] text-white/45 uppercase tracking-widest">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (name.trim()) dispatch({ type: "RENAME_PROJECT", name: name.trim() });
              dispatch({ type: "CLOSE_MODAL" });
            }
          }}
          className="ws-input w-full px-3 py-2 text-[13px]"
        />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          className="btn-ghost px-4 py-2 text-[12px]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim()) dispatch({ type: "RENAME_PROJECT", name: name.trim() });
            dispatch({ type: "CLOSE_MODAL" });
          }}
          className="btn-primary px-4 py-2 text-[12px]"
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteProjectModal() {
  const { state, dispatch } = useWorkspace();
  return (
    <ModalShell
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      title="Delete project?"
      width="max-w-[380px]"
    >
      <p className="text-[12.5px] text-white/60 leading-relaxed">
        This will permanently remove <span className="text-white">{state.projectName || "Untitled project"}</span>,
        including all screens, components, files and chat history. This cannot be undone.
      </p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          className="btn-ghost px-4 py-2 text-[12px]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            dispatch({ type: "RESET_PROJECT" });
          }}
          className="px-4 py-2 text-[12px] rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
        >
          Delete
        </button>
      </div>
    </ModalShell>
  );
}

function SaveStatus() {
  const { state, dispatch } = useWorkspace();
  const cloud=useProjects();
  return (
    <div className="hidden lg:flex items-center gap-1 text-[11px] text-white/35">
      {state.saveState === "saving" ? (
        <>
          <span className="relative flex h-1 w-1">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/60 opacity-50 animate-ping" />
            <span className="relative inline-flex h-1 w-1 rounded-full bg-amber-400" />
          </span>
          <span>Saving…</span>
        </>
      ) : state.saveState === "failed" ? (
        <>
          <span className="h-1 w-1 rounded-full bg-red-400/80" />
          <button
            onClick={() => dispatch({ type: "RETRY_SAVE" })}
            className="hover:text-white/55 transition-colors"
          >
            Save failed · Retry
          </button>
        </>
      ) : (
        <>
          <span className="h-1 w-1 rounded-full bg-emerald-400/80" />
          <span>{cloud?(state.saveState==='saved'?'Saved':'Not saved'):state.designSystem?"Session":"Empty"}</span>
        </>
      )}
    </div>
  );
}

// ─── Shared modal shell ─────────────────────────────────

function ModalShell({
  children,
  title,
  onClose,

}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  width?: string;
}) {
  return <Dialog title={title} onClose={onClose}>{children}</Dialog>;
}
