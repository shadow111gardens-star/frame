import {useAuth} from "../../auth/AuthProvider";
import { motion } from "framer-motion";
import { useHome } from "../store";

export function LogoutConfirm() {
  const auth=useAuth();
  const { state, dispatch } = useHome();
  const modal = state.modal;
  if (modal.type !== "logout") return null;
  return (
    <motion.div
      data-modal
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={() => dispatch({ type: "CLOSE_MODAL" })}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px] rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="text-[13px] text-white font-medium">Log out?</span>
          <button
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
            className="h-6 w-6 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.05] text-[14px]"
          >
            ×
          </button>
        </div>
        <div className="p-5">
          <p className="text-[12.5px] text-white/60 leading-relaxed">
            You'll need to sign back in to access your projects. Your data will
            remain on this device.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => dispatch({ type: "CLOSE_MODAL" })}
              className="btn-ghost px-4 py-2 text-[12px]"
            >
              Cancel
            </button>
            <button
              disabled={auth.busy}
              onClick={async () => {
                try{await auth.logout();dispatch({ type: "LOGOUT" });dispatch({ type: "CLOSE_MODAL" });}catch{/* AuthNotice displays the error; retain the session. */}
              }}
              className="px-4 py-2 text-[12px] rounded-full bg-white text-black hover:bg-white/90 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}