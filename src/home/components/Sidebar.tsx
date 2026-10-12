import {beginNewProject} from '../../workspace/store';
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHome, formatRelative } from "../store";
import { CreditsCard } from "./CreditsCard";
import { ProjectMenu } from "./ProjectMenu";
import type { HomeProject } from "../types";

export function Sidebar() {
  const { state, dispatch, projectsLoading } = useHome();
  const sortedProjects = [...state.projects].sort((a, b) => {
    // Favorites first, then by lastEdited desc
    if ((a.favorite ?? false) !== (b.favorite ?? false))
      return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
    return b.lastEdited - a.lastEdited;
  });

  const favorites = sortedProjects.filter((p) => p.favorite);
  const recents = sortedProjects.filter((p) => !p.favorite);

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#08080B] border-r border-white/[0.06] transition-all duration-300 ${
        state.collapsedSidebar ? "w-[68px]" : "w-[260px]"
      } ${state.mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
    >
      {/* Logo header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.06]">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            dispatch({ type: "NEW_CHAT" });
          }}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative h-6 w-6 grid place-items-center flex-shrink-0">
            <div className="absolute inset-0 rounded-[7px] bg-gradient-to-br from-white/90 to-white/30" />
            <div className="absolute inset-[1.5px] rounded-[5.5px] bg-black" />
            <div className="relative h-2.5 w-2.5 rounded-[3px] border border-white/70" />
          </div>
          {!state.collapsedSidebar && (
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-white">
              FRAME
            </span>
          )}
        </a>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          className="hidden md:grid h-6 w-6 place-items-center rounded text-white/45 hover:text-white hover:bg-white/[0.04] transition-colors"
          title={state.collapsedSidebar ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: state.collapsedSidebar ? "rotate(180deg)" : undefined,
              transition: "transform 0.3s",
            }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => dispatch({ type: "NEW_CHAT" })}
          className={`w-full flex items-center gap-2 ${
            state.collapsedSidebar ? "h-9 justify-center" : "h-9 px-3"
          } rounded-md bg-white text-black hover:bg-white/90 transition-all group`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {!state.collapsedSidebar && (
            <span className="text-[12.5px] font-medium">New Chat</span>
          )}
        </button>
      </div>

      <div className="px-3 pb-2"><button onClick={()=>{beginNewProject();window.location.hash='workspace';}} className="w-full h-9 rounded-md border border-white/10 text-white/75 text-[12px]" title="New Project">{state.collapsedSidebar?'+':'New Project'}</button></div>
      {/* Projects list (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto ws-scrollbar px-2 pb-2">
        {projectsLoading && !state.collapsedSidebar && <div role="status" className="px-2 pt-4 text-xs text-white/45">Loading your projects…</div>}
        {sortedProjects.length===0 && !projectsLoading && !state.collapsedSidebar && <div className="px-2 pt-4 text-[12px] text-white/35">No projects yet.</div>}
        {favorites.length > 0 && !state.collapsedSidebar && (
          <SectionLabel>Favorites</SectionLabel>
        )}
        {favorites.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            collapsed={state.collapsedSidebar}
            menuOpen={state.modal.type === "project-menu" && state.modal.projectId === p.id}
          />
        ))}

        {recents.length > 0 && (
          <SectionLabel collapsed={state.collapsedSidebar}>
            {favorites.length > 0 && !state.collapsedSidebar ? "All Projects" : "Projects"}
          </SectionLabel>
        )}
        {recents.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            collapsed={state.collapsedSidebar}
            menuOpen={state.modal.type === "project-menu" && state.modal.projectId === p.id}
          />
        ))}

        {state.projects.length === 0 && !projectsLoading && !state.collapsedSidebar && (
          <div className="text-center text-white/30 text-[12px] py-8">
            No projects yet
          </div>
        )}
      </div>

      {/* Bottom: credits + settings + logout */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <CreditsCard collapsed={state.collapsedSidebar} />

        {!state.collapsedSidebar ? (
          <div className="space-y-0.5">
            <BottomButton
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              }
              label="Settings"
              onClick={() =>
                dispatch({ type: "OPEN_MODAL", modal: { type: "settings" } })
              }
            />
            <BottomButton
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              }
              label="Log out"
              onClick={() =>
                dispatch({ type: "OPEN_MODAL", modal: { type: "logout" } })
              }
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <BottomButton
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
              label="Settings"
              compact
              onClick={() =>
                dispatch({ type: "OPEN_MODAL", modal: { type: "settings" } })
              }
            />
            <BottomButton
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              }
              label="Log out"
              compact
              onClick={() =>
                dispatch({ type: "OPEN_MODAL", modal: { type: "logout" } })
              }
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {state.modal.type === "project-menu" && <ProjectMenu />}
        {state.modal.type === "rename-project" && <RenameProjectInline />}
        {state.modal.type === "confirm-delete" && <ConfirmDeleteProject />}
      </AnimatePresence>
    </aside>
  );
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  if (collapsed) return <div className="h-2" />;
  return (
    <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35 font-mono">
      {children}
    </div>
  );
}

function ProjectRow({
  project,
  collapsed,
  menuOpen,
}: {
  project: HomeProject;
  collapsed: boolean;
  menuOpen: boolean;
}) {
  const { dispatch, openProject } = useHome();
  const buttonRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-pm]")) {
        dispatch({ type: "CLOSE_MODAL" });
      }
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen, dispatch]);

  return (
    <div
      className="relative group"
      data-pm
    >
      <a
        ref={buttonRef as any}
        href="#workspace"
        onClick={(e) => {
          e.preventDefault();
          void openProject(project.id).catch(() => {});
        }}
        className={`flex items-center gap-2 ${
          collapsed ? "h-9 justify-center px-0" : "h-9 px-2.5"
        } rounded-md text-white/75 hover:bg-white/[0.04] hover:text-white transition-colors w-full text-left`}
        title={project.name}
      >
        <div
          className="h-6 w-6 rounded-md grid place-items-center text-[10px] font-semibold flex-shrink-0"
          style={{
            background: `${project.color}22`,
            color: project.color,
            border: `1px solid ${project.color}33`,
          }}
        >
          {project.icon}
        </div>
        {!collapsed && (
          <>
            <span className="text-[12.5px] font-medium truncate flex-1 min-w-0">
              {project.name}
            </span>
            {project.favorite && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300/70 flex-shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dispatch({
                  type: "OPEN_MODAL",
                  modal: { type: "project-menu", projectId: project.id },
                });
              }}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1 rounded hover:bg-white/[0.05] transition-all flex-shrink-0"
              title="Project options"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
          </>
        )}
      </a>

      {!collapsed && (
        <div className="px-2.5 pb-1 -mt-1 text-[10px] text-white/30 font-mono pl-[3.25rem]">
          {formatRelative(project.lastEdited)}
        </div>
      )}
    </div>
  );
}

function BottomButton({
  icon,
  label,
  onClick,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 ${
        compact ? "h-8 w-8 justify-center" : "h-8 w-full px-2.5"
      } rounded-md text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors text-[12.5px]`}
      title={compact ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!compact && <span className="font-medium">{label}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Project menu (3-dot dropdown)
// ─────────────────────────────────────────────────────────

function RenameProjectInline() {
  const { state } = useHome();
  const modal = state.modal;
  if (modal.type !== "rename-project") return null;
  const project = state.projects.find((p) => p.id === modal.projectId);
  if (!project) return null;
  return (
    <RenameProjectModal projectId={project.id} initialName={project.name} />
  );
}

function RenameProjectModal({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const { dispatch } = useHome();
  const [name, setName] = useState(initialName);
  return (
    <CenteredModal
      title="Rename project"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            dispatch({ type: "RENAME_PROJECT", id: projectId, name: name.trim() });
            dispatch({ type: "CLOSE_MODAL" });
          }
        }}
        className="ws-input w-full px-3 py-2 text-[13px]"
      />
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          className="btn-ghost px-4 py-2 text-[12px]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim()) {
              dispatch({ type: "RENAME_PROJECT", id: projectId, name: name.trim() });
            }
            dispatch({ type: "CLOSE_MODAL" });
          }}
          className="btn-primary px-4 py-2 text-[12px]"
        >
          Save
        </button>
      </div>
    </CenteredModal>
  );
}

function ConfirmDeleteProject() {
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "confirm-delete") return null;
  const project = state.projects.find((p) => p.id === modal.projectId);
  if (!project) return null;
  return (
    <CenteredModal
      title="Delete project?"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      width="max-w-[380px]"
    >
      <p className="text-[12.5px] text-white/60 leading-relaxed">
        This will permanently remove <span className="text-white">{project.name}</span>
        {" "}and any associated chats. This cannot be undone.
      </p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          className="btn-ghost px-4 py-2 text-[12px]"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            dispatch({ type: "DELETE_PROJECT", id: project.id })
          }
          className="px-4 py-2 text-[12px] rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
        >
          Delete
        </button>
      </div>
    </CenteredModal>
  );
}

function CenteredModal({
  children,
  title,
  onClose,
  width = "max-w-[440px]",
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      data-modal
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full ${width} rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="text-[13px] text-white font-medium">{title}</span>
          <button
            onClick={onClose}
            className="h-6 w-6 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.05] text-[14px]"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}
