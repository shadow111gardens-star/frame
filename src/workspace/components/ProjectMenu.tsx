import { getSessionProjects, useWorkspace } from "../store";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Project menu is rendered as a dropdown next to the project name.
 * This is the content (project-menu modal type).
 */
export function ProjectMenu() {
  const { state, dispatch } = useWorkspace();
  const duplicateProject = () => {
    dispatch({ type: "DUPLICATE_PROJECT" });
    dispatch({ type: "CLOSE_MODAL" });
  };

  return (
    <AnimatePresence>
      <motion.div
        data-modal
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.12 }}
        className="absolute left-3 top-full mt-1.5 w-56 rounded-md border border-white/[0.08] bg-[#0A0A0D] shadow-2xl z-50 p-1"
      >
        <button onClick={()=>dispatch({type:'OPEN_MODAL',modal:{type:'new-project'}})} className="w-full text-left px-2.5 py-1.5 rounded text-white/85 hover:bg-white/[0.05] text-[12px]">New Project</button>
        {getSessionProjects().filter(p=>p.id!==state.projectId).map(p=><button key={p.id} onClick={()=>dispatch({type:'OPEN_PROJECT',id:p.id})} className="w-full text-left px-2.5 py-1.5 rounded text-white/70 hover:bg-white/[0.05] text-[12px]">Open {p.name}</button>)}
        <button
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: { type: "rename-project" } })}
          className="w-full text-left px-2.5 py-1.5 rounded text-white/85 hover:bg-white/[0.05] text-[12px]"
        >
          Rename project
        </button>
        <button
          onClick={duplicateProject}
          className="w-full text-left px-2.5 py-1.5 rounded text-white/85 hover:bg-white/[0.05] text-[12px]"
        >
          Duplicate project
        </button>
        <div className="my-1 h-px bg-white/[0.06]" />
        <button
          onClick={() =>
            dispatch({ type: "OPEN_MODAL", modal: { type: "confirm-delete-project" } })
          }
          className="w-full text-left px-2.5 py-1.5 rounded text-red-300/85 hover:bg-red-500/[0.08] text-[12px]"
        >
          Delete project
        </button>
      </motion.div>
    </AnimatePresence>
  );
}