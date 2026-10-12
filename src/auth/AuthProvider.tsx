import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import { AuthStore } from "./store";
export const frameAuth = new AuthStore(
  async () => (await import("./firebase")).firebaseAdapter(),
  () => {
    try {
      return window.sessionStorage;
    } catch {
      return undefined;
    }
  },
  (hash) => {
    window.location.hash = hash;
  },
);
const AuthContext = createContext(frameAuth);
export function AuthProvider({
  children,
  store = frameAuth,
}: {
  children: ReactNode;
  store?: AuthStore;
}) {
  useEffect(() => {
    void store.start();
  }, [store]);
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const store = useContext(AuthContext);
  const state = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.snapshot,
  );
  return {
    ...state,
    uid: state.user?.uid ?? null,
    signIn: store.signIn,
    logout: store.logout,
    remember: (hash: string) => store.remember(hash),
  };
}
export function AuthLink({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const auth = useAuth(),
    disabled = auth.busy || auth.status === "loading";
  return (
    <a
      {...props}
      href="#"
      aria-disabled={disabled}
      aria-busy={auth.busy}
      onClick={(event) => {
        event.preventDefault();
        if (!disabled) void auth.signIn("#home", { forcePopup: true });
      }}
    >
      {auth.busy
        ? "Connecting Google…"
        : auth.status === "loading"
          ? "Loading…"
          : children}
    </a>
  );
}
export function AuthButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const auth = useAuth();
  const disabled = props.disabled || auth.busy || auth.status === "loading";
  return (
    <button
      {...props}
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      aria-busy={auth.busy}
      onClick={() => {
        if (!disabled) void auth.signIn("#home", { forcePopup: true });
      }}
    >
      {auth.busy
        ? "Connecting Google…"
        : auth.status === "loading"
          ? "Loading…"
          : children}
    </button>
  );
}
export function AuthNotice() {
  const auth = useAuth();
  return auth.error ? (
    <div
      role="alert"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] rounded-xl border border-white/15 bg-[#101014] px-5 py-3 text-sm text-white shadow-xl"
    >
      {auth.error}
    </div>
  ) : null;
}
