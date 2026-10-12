import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import { clearSessionProjects } from "../workspace/store";
import { ProjectsStore, type ProjectsState } from "./store";

export const frameProjects = new ProjectsStore(
  async () => (await import("./firestore")).firestoreProjects(),
  () => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  },
);
const Context = createContext<ProjectsStore | null>(null);
export function ProjectsProvider({
  children,
  store = frameProjects,
}: {
  children: ReactNode;
  store?: ProjectsStore;
}) {
  const auth = useAuth();
  useEffect(() => {
    clearSessionProjects();
    void store.connect(auth.status === "authenticated" ? auth.uid : null);
  }, [store, auth.uid, auth.status]);
  useEffect(() => {
    const flush = () => {
      void store.settleAll().catch(() => {});
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!store.hasPending()) return;
      flush();
      event.preventDefault();
      event.returnValue = "";
    };
    const online = () => {
      void store.retry().catch(() => {});
    };
    window.addEventListener("hashchange", flush);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("hashchange", flush);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", online);
      flush();
    };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useProjects() {
  const store = useContext(Context);
  // Subscribe consistently even in existing isolated editor tests without cloud.
  const fallback = useRef<ProjectsState>({
    uid: null,
    loading: false,
    opening: false,
    projects: [],
    active: null,
    error: null,
    saves: {},
  });
  const state = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.snapshot ?? (() => fallback.current),
    store?.snapshot ?? (() => fallback.current),
  );
  const auth = useAuth();
  if (!store) return null;
  const ready = auth.status === "authenticated" && state.uid === auth.uid;
  return {
    store,
    state: ready
      ? state
      : {
          ...state,
          uid: auth.uid,
          projects: [],
          active: null,
          loading: true,
          error: null,
        },
  };
}
export function ProjectsNotice() {
  const cloud = useProjects();
  if (!cloud?.state.error) return null;
  const conflicts = Object.entries(cloud.state.saves).filter(
    ([, status]) => status === "failed",
  );
  return (
    <div
      role="alert"
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] max-w-[90vw] rounded-xl border border-red-400/25 bg-[#101014] px-5 py-3 text-sm text-white shadow-xl"
    >
      {cloud.state.error}
      <button
        className="ml-3 underline"
        onClick={() => {
          void cloud.store.retry().catch(() => {});
        }}
      >
        Retry
      </button>
      {conflicts.length > 0 && (
        <button
          className="ml-3 underline"
          onClick={() => {
            void cloud.store.recoverAsCopy(conflicts[0][0]).catch(() => {});
          }}
        >
          Save pending work as copy
        </button>
      )}
    </div>
  );
}
export function WorkspaceCloudGate({ children }: { children: ReactNode }) {
  const cloud = useProjects();
  const id = cloud?.store.activeId();
  useEffect(() => {
    if (cloud && !cloud.state.loading && !cloud.state.active && id)
      void cloud.store.open(id).catch(() => {});
  }, [cloud?.store, cloud?.state.loading, cloud?.state.uid, id]);
  if (!cloud) return <>{children}</>;
  if (cloud.state.loading || cloud.state.opening)
    return (
      <div
        role="status"
        className="min-h-screen grid place-items-center bg-[#050507] text-white/65"
      >
        Loading your project…
      </div>
    );
  if (id && !cloud.state.active)
    return (
      <div className="min-h-screen grid place-items-center bg-[#050507] text-white/65">
        <div>
          <p role="alert">{cloud.state.error || "Loading your project…"}</p>
          <button
            className="mt-3 mr-4 underline"
            onClick={() => {
              void cloud.store.open(id).catch(() => {});
            }}
          >
            Retry
          </button>
          <a href="#home" className="underline">
            Back to home
          </a>
        </div>
      </div>
    );
  return <>{children}</>;
}
