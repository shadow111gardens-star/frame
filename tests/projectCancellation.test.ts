import { test } from "node:test";
import assert from "node:assert/strict";
import { ProjectsStore } from "../src/projects/store";
import { runProjectOperation } from "../src/projects/operations";
import { ProjectCancelledError } from "../src/projects/types";
import {
  MemoryProjects,
  memoryStorage,
  projectFixture,
} from "./projectFixture";

test("SDK cancellation retries once; repeated aborts and real failures stay visible without sensitive logs", async () => {
  const logs: Record<string, unknown>[] = [];
  let calls = 0;
  const value = await runProjectOperation(
    "read",
    "owner-secret",
    () => "owner-secret",
    async () => {
      if (++calls === 1)
        throw new DOMException("internal-token-secret", "AbortError");
      return 42;
    },
    (d) => logs.push(d),
  );
  assert.equal(value, 42);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    () =>
      runProjectOperation(
        "save",
        "owner-secret",
        () => "owner-secret",
        async () => {
          calls++;
          throw new DOMException("internal-token-secret", "AbortError");
        },
        (d) => logs.push(d),
      ),
    (e: any) => e.code === "cancelled",
  );
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    () =>
      runProjectOperation(
        "save",
        "owner-secret",
        () => "owner-secret",
        async () => {
          calls++;
          throw { code: "permission-denied", message: "internal-token-secret" };
        },
        (d) => logs.push(d),
      ),
    (e: any) => e.code === "permission-denied",
  );
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(logs).includes("owner-secret"));
  assert.ok(!JSON.stringify(logs).includes("internal-token-secret"));
});
test("scope invalidation cancels an operation without retrying under another UID", async () => {
  let uid = "UID-A",
    calls = 0;
  await assert.rejects(
    () =>
      runProjectOperation(
        "read",
        uid,
        () => uid,
        async () => {
          calls++;
          uid = "UID-B";
          throw new DOMException("aborted", "AbortError");
        },
        () => {},
      ),
    ProjectCancelledError,
  );
  assert.equal(calls, 1);
});
test("a synchronous save/auth failure never leaves a permanently cached rejected flight", async () => {
  const repo = new MemoryProjects(),
    storage = memoryStorage(),
    store = new ProjectsStore(
      async () => repo,
      () => storage,
      10000,
    );
  await store.connect("UID-A");
  store.queue(projectFixture());
  repo.uid = null;
  await assert.rejects(() => store.flush());
  repo.uid = "UID-A";
  await store.flush();
  assert.equal(store.state.saves["project-one"], "saved");
  assert.equal(repo.rows.size, 1);
});
test("duplicate opens deduplicate network reads and superseded loads cannot change the active project", async () => {
  const repo = new MemoryProjects(),
    storage = memoryStorage(),
    store = new ProjectsStore(
      async () => repo,
      () => storage,
      10000,
    );
  await store.connect("UID-A");
  await store.create(projectFixture("one"));
  await store.create(projectFixture("two"));
  const load = repo.load.bind(repo);
  let calls = 0,
    release!: () => void;
  repo.load = async (id) => {
    calls++;
    if (id === "one")
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return load(id);
  };
  const older = store.open("one");
  const duplicate = store.open("one");
  assert.equal(older, duplicate);
  const rejection = assert.rejects(() => older, ProjectCancelledError);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await store.open("two");
  release();
  await rejection;
  assert.equal(calls, 2);
  assert.equal(store.state.active?.id, "two");
  assert.equal(store.state.error, null);
});
test("cleanup unsubscribes once, stale failures do not leak to another user, and the original journal survives", async () => {
  const repo = new MemoryProjects(),
    storage = memoryStorage(),
    store = new ProjectsStore(
      async () => repo,
      () => storage,
      10000,
    );
  await store.connect("UID-A");
  let notices = 0;
  const unsubscribe = store.subscribe(() => notices++);
  unsubscribe();
  unsubscribe();
  let release!: () => void;
  repo.hold = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  store.queue(projectFixture());
  const saving = store.flush();
  const handled = saving.catch((error) => store.report(error));
  repo.uid = "UID-B";
  await store.connect("UID-B");
  release();
  await handled;
  assert.equal(notices, 0);
  assert.equal(store.state.uid, "UID-B");
  assert.equal(store.state.error, null);
  assert.deepEqual(store.state.projects, []);
  assert.ok(storage.getItem("frame.projects.pending.UID-A"));
});
