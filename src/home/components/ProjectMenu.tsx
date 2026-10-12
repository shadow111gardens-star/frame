import { motion, AnimatePresence } from "framer-motion";
import { useHome } from "../store";

export function ProjectMenu() {
  const { state, dispatch, openProject } = useHome();
  const modal = state.modal;
  if (modal.type !== "project-menu") return null;
  const project = state.projects.find((p) => p.id === modal.projectId);
  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-pm
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.12 }}
        className="fixed left-[260px] top-[120px] rounded-md border border-white/[0.08] bg-[#0A0A0D] shadow-2xl z-50 w-48 p-1"
        style={{ pointerEvents: "auto" }}
      >
        <MenuButton
          label="Open"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          }
          onClick={() => {
            dispatch({ type: "CLOSE_MODAL" });
            void openProject(project.id).catch(() => {});
          }}
        />
        <MenuButton
          label="Rename"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          }
          onClick={() =>
            dispatch({
              type: "OPEN_MODAL",
              modal: { type: "rename-project", projectId: project.id },
            })
          }
        />
        <MenuButton
          label="Duplicate"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          }
          onClick={() => dispatch({ type: "DUPLICATE_PROJECT", id: project.id })}
        />
        <MenuButton
          label={project.favorite ? "Unfavorite" : "Favorite"}
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill={project.favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          onClick={() => dispatch({ type: "TOGGLE_FAVORITE", id: project.id })}
        />
        <div className="my-1 h-px bg-white/[0.06]" />
        <MenuButton
          label="Delete"
          danger
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          }
          onClick={() =>
            dispatch({
              type: "OPEN_MODAL",
              modal: { type: "confirm-delete", projectId: project.id },
            })
          }
        />
      </motion.div>
    </AnimatePresence>
  );
}

function MenuButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[12px] transition-colors ${
        danger
          ? "text-red-300/85 hover:bg-red-500/[0.08]"
          : "text-white/85 hover:bg-white/[0.05]"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
