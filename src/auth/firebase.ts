import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type Auth,
} from "firebase/auth";
import type { AuthAdapter } from "./store";

// Public web-app identifiers, never privileged server credentials.
export const firebaseConfig = {
  apiKey: "AIzaSyDyfk1OKJj4BhhkMDHNdct433dk25WyDvU",
  authDomain: "frame-44bbd.firebaseapp.com",
  projectId: "frame-44bbd",
  storageBucket: "frame-44bbd.firebasestorage.app",
  messagingSenderId: "604049702868",
  appId: "1:604049702868:web:f7ba5e403c6397f63fa041",
  measurementId: "G-JE86TNZB5E",
};
export function initializeFrameFirebase(
  sdk = { getApps, initializeApp },
): FirebaseApp {
  const existing = sdk.getApps().find((app) => app.name === "[DEFAULT]");
  if (
    existing &&
    Object.entries(firebaseConfig).some(
      ([key, value]) =>
        existing.options[key as keyof typeof firebaseConfig] !== value,
    )
  )
    throw { code: "auth/app-not-authorized" };
  return existing ?? sdk.initializeApp(firebaseConfig);
}
let adapter: AuthAdapter | undefined;
// Keep the SDK boundary testable without replacing the button or auth store.
export function createFirebaseAuthAdapter(
  auth: Auth,
  sdk = {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
  },
): AuthAdapter {
  const googleProvider = () => {
    const provider = new sdk.GoogleAuthProvider();
    // An explicit Start Designing click must show the account chooser even
    // when Firebase or Google has a remembered session.
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  };
  return {
    observe: (next, error) => sdk.onAuthStateChanged(auth, next, error),
    // Firebase creates a user on first Google login and reuses that identity
    // on subsequent logins. Always preserve the returned Firebase User/UID.
    popup: async () => (await sdk.signInWithPopup(auth, googleProvider())).user,
    redirect: () => sdk.signInWithRedirect(auth, googleProvider()),
    redirectResult: async () =>
      (await sdk.getRedirectResult(auth))?.user ?? null,
    logout: () => sdk.signOut(auth),
  };
}
export function firebaseAdapter(): AuthAdapter {
  if (adapter) return adapter;
  adapter = createFirebaseAuthAdapter(getAuth(initializeFrameFirebase()));
  return adapter;
}
