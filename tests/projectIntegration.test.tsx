import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { AuthStore, type AuthUser } from "../src/auth/store";
import { ProjectsStore } from "../src/projects/store";
import { MemoryProjects } from "./projectFixture";
import { fixture } from "./fixture";

test("actual home prompt, generation, editor edits, refresh, and account changes use cloud projects", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/#home",
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
  const { AuthProvider } = await import("../src/auth/AuthProvider");
  const { ProjectsProvider, ProjectsNotice } = await import(
    "../src/projects/ProjectsProvider"
  );
  const { WorkspaceProvider, useWorkspace } = await import(
    "../src/workspace/store"
  );
  const { default: App } = await import("../src/App");
  const repo = new MemoryProjects();
  const cloud = new ProjectsStore(
    async () => repo,
    () => localStorage,
    10,
  );
  const user: AuthUser = {
    uid: "UID-A",
    displayName: "User A",
    email: "a@example.test",
    photoURL: null,
  };
  let authNext!: (user: AuthUser | null) => void;
  const auth = new AuthStore(
    async () => ({
      observe(next) {
        authNext = next;
        queueMicrotask(() => next(user));
        return () => {};
      },
      async popup() {
        return user;
      },
      async redirect() {},
      async redirectResult() {
        return null;
      },
      async logout() {
        authNext(null);
      },
    }),
    () => sessionStorage,
    (hash) => {
      window.location.hash = hash;
    },
  );
  const root = createRoot(document.getElementById("root")!);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
  const oldFetch = globalThis.fetch;
  let generations = 0;
  globalThis.fetch = (async () => {
    generations++;
    return new Response(
      JSON.stringify({
        app: fixture(),
        message: "Created editable Fitness screens",
      }),
    );
  }) as typeof fetch;
  let editor!: ReturnType<typeof useWorkspace>;
  function Observe() {
    editor = useWorkspace();
    return null;
  }
  const renderApp = (store = cloud) =>
    root.render(
      <React.StrictMode>
        <AuthProvider store={auth}>
          <ProjectsProvider store={store}>
            <App />
            <ProjectsNotice />
          </ProjectsProvider>
        </AuthProvider>
      </React.StrictMode>,
    );
  try {
    await React.act(async () => {
      renderApp();
      await settle();
    });
    await React.act(async () => {
      await auth.start();
      await cloud.connect(user.uid);
      await settle();
    });
    const textarea = document.querySelector("textarea")!;
    assert.ok(textarea);
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(
        dom.window.HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(textarea, "Create a fitness app");
      textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    const generate = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Generate",
    )!;
    assert.ok(generate);
    assert.equal(generate.disabled, false);
    await React.act(async () => {
      generate.click();
      await settle();
    });
    for (let i = 0; i < 12 && generations === 0; i++)
      await React.act(async () => {
        await settle();
      });
    await React.act(async () => {
      await settle();
      await cloud.flush();
    });
    assert.equal(window.location.hash, "#workspace");
    assert.equal(generations, 1);
    assert.equal(repo.rows.size, 1);
    const id = cloud.state.active!.id;
    const saved = repo.rows.get("UID-A/" + id)!;
    assert.equal(saved.initialPrompt, "Create a fitness app");
    assert.equal(saved.snapshot.projectId, id);
    assert.ok(saved.snapshot.components.button);
    assert.ok(
      saved.snapshot.messages.some(
        (m) =>
          m.role === "assistant" &&
          m.content.includes("Created editable Fitness"),
      ),
    );
    await React.act(async () => {
      root.render(
        <AuthProvider store={auth}>
          <ProjectsProvider store={cloud}>
            <WorkspaceProvider>
              <Observe />
            </WorkspaceProvider>
          </ProjectsProvider>
        </AuthProvider>,
      );
      await settle();
    });
    assert.equal(editor.state.projectId, id);
    await React.act(async () => {
      editor.dispatch({
        type: "UPDATE_COMPONENT_DATA",
        id: "button",
        data: { text: "Persisted edit" },
      });
    });
    assert.equal(editor.state.components.button.text, "Persisted edit");
    await React.act(async () => {
      await cloud.flush();
    });
    assert.equal(
      repo.rows.get("UID-A/" + id)?.snapshot.components.button.text,
      "Persisted edit",
    );
    const refreshed = new ProjectsStore(
      async () => repo,
      () => localStorage,
      10,
    );
    await React.act(async () => {
      renderApp(refreshed);
      await settle();
    });
    for (let i = 0; i < 10 && !refreshed.state.active; i++)
      await React.act(async () => {
        await settle();
      });
    assert.equal(refreshed.state.active?.id, id);
    assert.equal(
      refreshed.state.active?.snapshot.components.button.text,
      "Persisted edit",
    );
    assert.equal(generations, 1);
    await React.act(async () => {
      window.location.hash = "#home";
      await settle();
    });
    assert.ok(document.body.textContent?.includes("Fitness"));
    await React.act(async () => {
      await refreshed.flush();
      await auth.logout();
      await settle();
    });
    assert.equal(window.location.hash, "");
    assert.equal(refreshed.state.active, null);
    assert.deepEqual(refreshed.state.projects, []);
    await React.act(async () => {
      repo.uid = "UID-B";
      authNext({ ...user, uid: "UID-B", displayName: "User B" });
      window.location.hash = "#home";
      await settle();
    });
    assert.deepEqual(refreshed.state.projects, []);
    assert.equal(document.querySelector('a[title="Fitness"]'), null);
    await React.act(async () => {
      repo.uid = "UID-A";
      authNext(user);
      await settle();
    });
    assert.equal(refreshed.state.projects[0]?.id, id);
  } finally {
    globalThis.fetch = oldFetch;
    await React.act(async () => root.unmount());
    dom.window.close();
  }
});
