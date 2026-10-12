import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AuthStore,
  authError,
  safeDestination,
  protectedRoute,
  type AuthAdapter,
  type AuthUser,
} from "../src/auth/store";
import { initializeFrameFirebase, firebaseConfig } from "../src/auth/firebase";
const user: AuthUser = {
  uid: "firebase-uid",
  displayName: "Test User",
  email: "test@example.test",
  photoURL: null,
};

test("explicit Google prompt keeps a restored UID and waits for popup success", async () => {
  const h = harness(user);
  await h.store.start();
  let complete!: (user: AuthUser) => void;
  h.sdk.popup = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const signIn = h.store.signIn("#home", { forcePopup: true });
  assert.deepEqual(h.navigation, []);
  assert.equal(h.store.state.busy, true);
  complete(user);
  await signIn;
  assert.equal(h.store.state.user?.uid, user.uid);
  assert.deepEqual(h.navigation, ["#home"]);
});

test("cancelled explicit Google prompt preserves the existing session without navigating", async () => {
  const h = harness(user);
  await h.store.start();
  h.sdk.popup = async () => {
    throw { code: "auth/popup-closed-by-user" };
  };
  await h.store.signIn("#home", { forcePopup: true });
  assert.equal(h.store.state.user, user);
  assert.equal(h.store.state.busy, false);
  assert.ok(h.store.state.error?.includes("cancelled"));
  assert.deepEqual(h.navigation, []);
});
function harness(initial: AuthUser | null = null) {
  let listener!: (user: AuthUser | null) => void,
    observations = 0,
    popups = 0,
    redirects = 0,
    logouts = 0;
  const values = new Map<string, string>(),
    navigation: string[] = [];
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } as Storage;
  const sdk: AuthAdapter = {
    observe(next) {
      listener = next;
      observations++;
      queueMicrotask(() => next(initial));
      return () => {};
    },
    async popup() {
      popups++;
      return user;
    },
    async redirect() {
      redirects++;
    },
    async redirectResult() {
      return null;
    },
    async logout() {
      logouts++;
      listener(null);
    },
  };
  const store = new AuthStore(
    async () => sdk,
    () => storage,
    (hash) => navigation.push(hash),
  );
  return {
    store,
    sdk,
    navigation,
    values,
    emit: (next: AuthUser | null) => listener(next),
    counts: () => ({ observations, popups, redirects, logouts }),
  };
}
test("Firebase initialization reuses only the existing default app and supplied project", () => {
  let initialized = 0;
  const existing = { name: "[DEFAULT]", options: { ...firebaseConfig } } as any;
  assert.equal(
    initializeFrameFirebase({
      getApps: () => [existing],
      initializeApp: () => {
        throw new Error("duplicate");
      },
    }),
    existing,
  );
  const sdk = {
    getApps: () => [{ name: "other" }] as any,
    initializeApp: (config: any) => {
      initialized++;
      assert.equal(config.projectId, "frame-44bbd");
      assert.equal(config.authDomain, "frame-44bbd.firebaseapp.com");
      return existing;
    },
  };
  assert.equal(initializeFrameFirebase(sdk), existing);
  assert.equal(initialized, 1);
  assert.equal(firebaseConfig.projectId, "frame-44bbd");
  assert.throws(() =>
    initializeFrameFirebase({
      ...sdk,
      getApps: () =>
        [{ name: "[DEFAULT]", options: { projectId: "wrong-project" } }] as any,
    }),
  );
});
test("one auth listener restores state and observes later changes without premature readiness", async () => {
  const h = harness(user);
  let release!: (value: null) => void;
  h.sdk.redirectResult = () => new Promise((resolve) => (release = resolve));
  const startup = h.store.start();
  assert.equal(h.store.start(), startup);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(h.store.state.status, "loading");
  release(null);
  await startup;
  assert.equal(h.store.state.user?.uid, user.uid);
  assert.equal(h.counts().observations, 1);
  h.emit(null);
  assert.equal(h.store.state.status, "unauthenticated");
  h.emit(user);
  assert.equal(h.store.state.status, "authenticated");
});
test("sign-in obtains Firebase identity, prevents duplicates and navigates only on success", async () => {
  const h = harness();
  await h.store.start();
  let release!: (user: AuthUser) => void;
  h.sdk.popup = () => new Promise((resolve) => (release = resolve));
  let events = 0;
  h.store.subscribe(() => events++);
  const request = h.store.signIn("#home");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await h.store.signIn();
  assert.equal(h.store.state.busy, true);
  assert.deepEqual(h.navigation, []);
  release(user);
  await request;
  assert.equal(h.store.state.user?.uid, "firebase-uid");
  assert.deepEqual(h.navigation, ["#home"]);
  assert.ok(events > 0);
  assert.equal(h.store.state.busy, false);
});
test("restored users enter home without opening another popup", async () => {
  const h = harness(user);
  await h.store.start();
  await h.store.signIn();
  assert.deepEqual(h.navigation, ["#home"]);
  assert.equal(h.counts().popups, 0);
});
test("cancelled, network, domain and configuration failures do not open the workspace", async () => {
  for (const code of [
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
    "auth/network-request-failed",
    "auth/unauthorized-domain",
    "auth/invalid-api-key",
    "auth/operation-not-allowed",
  ]) {
    const h = harness();
    await h.store.start();
    h.sdk.popup = async () => {
      throw { code, message: "private provider detail" };
    };
    await h.store.signIn();
    assert.equal(h.store.state.status, "unauthenticated");
    assert.equal(h.store.state.busy, false);
    assert.deepEqual(h.navigation, []);
    assert.ok(h.store.state.error);
    assert.ok(!h.store.state.error.includes("private"));
  }
  assert.ok(
    authError({ code: "auth/popup-closed-by-user" }).includes("cancelled"),
  );
});
test("blocked popup uses one redirect with a safe remembered destination; redirect restores identity", async () => {
  const h = harness();
  await h.store.start();
  h.sdk.popup = async () => {
    throw { code: "auth/popup-blocked" };
  };
  await h.store.signIn("https://external.test");
  assert.equal(h.counts().redirects, 1);
  assert.deepEqual(h.navigation, []);
  assert.equal(h.values.get("frame.auth.destination"), "#home");
  const restored = new AuthStore(
    async () => ({ ...h.sdk, redirectResult: async () => user }),
    () =>
      ({
        getItem: (key: string) => h.values.get(key) ?? null,
        removeItem: (key: string) => h.values.delete(key),
      }) as Storage,
    (hash) => h.navigation.push(hash),
  );
  await restored.start();
  assert.equal(restored.state.user?.uid, user.uid);
  assert.deepEqual(h.navigation, ["#home"]);
  assert.equal(h.values.size, 0);
});
test("logout uses Firebase and failures preserve the authenticated user", async () => {
  const h = harness(user);
  await h.store.start();
  h.sdk.logout = async () => {
    throw { code: "auth/network-request-failed" };
  };
  await assert.rejects(() => h.store.logout());
  assert.equal(h.store.state.user?.uid, user.uid);
  assert.deepEqual(h.navigation, []);
  h.sdk.logout = async () => {
    h.emit(null);
  };
  await h.store.logout();
  assert.equal(h.store.state.user, null);
  assert.deepEqual(h.navigation, [""]);
});
test("protected routes and return destinations are local and allowlisted", () => {
  assert.equal(protectedRoute("workspace"), true);
  assert.equal(protectedRoute("home"), true);
  assert.equal(protectedRoute("landing"), false);
  for (const destination of [
    "https://external.test",
    "//external.test",
    "#workspace/unsafe",
    null,
  ])
    assert.equal(safeDestination(destination), "#home");
  assert.equal(safeDestination("#home"), "#home");
});
test("SDK initialization failure clears loading and exposes no internal credential details", async () => {
  const navigation: string[] = [];
  const store = new AuthStore(
    async () => {
      throw {
        code: "auth/invalid-api-key",
        message: "sensitive internal detail",
      };
    },
    () => undefined,
    (hash) => navigation.push(hash),
  );
  await store.start();
  assert.equal(store.state.status, "unauthenticated");
  assert.ok(!store.state.error?.includes("sensitive"));
  await store.signIn();
  assert.deepEqual(navigation, []);
  assert.equal(store.state.busy, false);
});

test("refresh restores the session without navigating or opening a popup", async () => {
  const h = harness(user);
  await h.store.start();
  assert.equal(h.store.state.status, "authenticated");
  assert.deepEqual(h.navigation, []);
  assert.equal(h.counts().popups, 0);
});
test("redirect failure does not disable subsequent auth-state observations", async () => {
  const h = harness();
  h.sdk.redirectResult = async () => {
    throw { code: "auth/network-request-failed" };
  };
  await h.store.start();
  assert.ok(h.store.state.error);
  h.emit(user);
  assert.equal(h.store.state.user?.uid, user.uid);
  h.emit(null);
  assert.equal(h.store.state.status, "unauthenticated");
});
test("a restored pending redirect navigates home even when SDK redirect result is null", async () => {
  const h = harness(user);
  h.values.set("frame.auth.redirect", "true");
  h.values.set("frame.auth.destination", "#home");
  await h.store.start();
  assert.deepEqual(h.navigation, ["#home"]);
  assert.equal(h.values.size, 0);
});
test("explicit protected destination is allowlisted, but Start Designing overrides it to home", async () => {
  const h = harness();
  await h.store.start();
  h.store.remember("#workspace");
  await h.store.signIn("#home");
  assert.deepEqual(h.navigation, ["#home"]);
  assert.equal(safeDestination("#workspace"), "#workspace");
});
