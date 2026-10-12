import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { GoogleAuthProvider, type Auth, type User } from "firebase/auth";
import { createFirebaseAuthAdapter } from "../src/auth/firebase";
import { AuthStore } from "../src/auth/store";

test("landing Start Designing reaches the Firebase popup boundary for new and returning users", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "SVGElement",
    "localStorage",
    "sessionStorage",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, key, {
      value: (dom.window as any)[key],
      configurable: true,
    });
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollTo = () => {};
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AuthProvider, AuthNotice } = await import("../src/auth/AuthProvider");
  const { default: App } = await import("../src/App");
  const root = createRoot(document.getElementById("root")!);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
  try {
    for (const uid of ["new-google-user-uid", "original-returning-user-uid"]) {
      const firebaseUser = {
        uid,
        displayName: "Google User",
        email: "user@example.test",
        photoURL: "https://example.test/avatar.png",
      } as User;
      const auth = { app: { options: { projectId: "frame-44bbd" } } } as Auth;
      let popupCalls = 0,
        observeCalls = 0;
      let resolvePopup!: (result: { user: User }) => void;
      let rejectPopup!: (error: unknown) => void;
      const providers: GoogleAuthProvider[] = [];
      const sdk = {
        GoogleAuthProvider,
        onAuthStateChanged(
          actualAuth: Auth,
          next: (user: User | null) => void,
        ) {
          assert.equal(actualAuth, auth);
          observeCalls++;
          queueMicrotask(() => next(null));
          return () => {};
        },
        signInWithPopup(actualAuth: Auth, provider: GoogleAuthProvider) {
          assert.equal(actualAuth, auth);
          assert.ok(provider instanceof GoogleAuthProvider);
          assert.equal(provider.providerId, "google.com");
          providers.push(provider);
          popupCalls++;
          return new Promise<{ user: User }>((resolve, reject) => {
            resolvePopup = resolve;
            rejectPopup = reject;
          });
        },
        signInWithRedirect() {
          throw new Error("unexpected redirect");
        },
        async getRedirectResult() {
          return null;
        },
        async signOut() {},
      };
      const store = new AuthStore(
        async () => createFirebaseAuthAdapter(auth, sdk as any),
        () => sessionStorage,
        (hash) => {
          window.location.hash = hash;
        },
      );
      await React.act(async () => {
        window.location.hash = "";
        root.render(
          <React.StrictMode>
            <AuthProvider store={store}>
              <App />
              <AuthNotice />
            </AuthProvider>
          </React.StrictMode>,
        );
        await settle();
      });
      await React.act(async () => {
        await store.start();
      });
      const button = Array.from(document.querySelectorAll("main button")).find(
        (a) => a.textContent?.trim() === "Start Designing",
      ) as HTMLButtonElement;
      assert.ok(button, "use the existing Hero CTA rendered by App");
      assert.ok(button.classList.contains("btn-primary"));
      assert.equal(button.tagName, "BUTTON");
      assert.equal(button.type, "button");
      assert.equal(
        button.hasAttribute("href"),
        false,
        "CTA cannot use native navigation to bypass Firebase",
      );
      await React.act(async () => {
        button.click();
        // The SDK must be called synchronously from the actual click handler.
        assert.equal(popupCalls, 1);
        button.click();
        assert.equal(popupCalls, 1);
      });
      assert.equal(window.location.hash, "");
      assert.equal(button.getAttribute("aria-disabled"), "true");
      assert.equal(button.getAttribute("aria-busy"), "true");
      assert.ok(button.textContent?.includes("Connecting Google"));
      await React.act(async () => {
        rejectPopup({
          code: "auth/network-request-failed",
          message: "internal SDK trace",
        });
        await settle();
      });
      assert.equal(window.location.hash, "");
      assert.equal(store.state.user, null);
      assert.ok(
        document
          .querySelector('[role="alert"]')
          ?.textContent?.includes("Check your connection"),
      );
      assert.ok(!document.body.textContent?.includes("internal SDK trace"));
      assert.equal(button.getAttribute("aria-disabled"), "false");
      await React.act(async () => {
        button.click();
        assert.equal(popupCalls, 2);
        resolvePopup({ user: firebaseUser });
        await settle();
      });
      assert.notEqual(
        providers[0],
        providers[1],
        "each attempt gets a fresh Google provider",
      );
      assert.equal(window.location.hash, "#home");
      assert.equal(
        store.state.user,
        firebaseUser,
        "keep the Firebase user object without creating a replacement identity",
      );
      assert.equal(store.state.user?.uid, uid);
      assert.equal(observeCalls, 1);
      await React.act(async () => {
        window.location.hash = "";
        await settle();
      });
      const authenticatedButton = Array.from(
        document.querySelectorAll("main button"),
      ).find(
        (a) => a.textContent?.trim() === "Start Designing",
      ) as HTMLButtonElement;
      await React.act(async () => {
        authenticatedButton.click();
        assert.equal(
          popupCalls,
          3,
          "explicit CTA opens Google even with a restored Firebase session",
        );
        assert.equal(
          window.location.hash,
          "",
          "do not navigate before Google completes",
        );
        assert.deepEqual(providers[2].customParameters, {
          prompt: "select_account",
        });
        resolvePopup({ user: firebaseUser });
        await settle();
        assert.equal(window.location.hash, "#home");
        assert.equal(store.state.user?.uid, uid);
      });
    }
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
});
