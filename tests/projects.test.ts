import { test } from "node:test";
import assert from "node:assert/strict";
import { ProjectsStore } from "../src/projects/store";
import {
  encodeSnapshot,
  decodeSnapshot,
  splitJson,
  CHUNK_BYTES,
} from "../src/projects/codec";
import {
  MemoryProjects,
  memoryStorage,
  projectFixture,
} from "./projectFixture";
const delay = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
function harness(ms = 10) {
  const repo = new MemoryProjects(),
    storage = memoryStorage();
  const store = new ProjectsStore(
    async () => repo,
    () => storage,
    ms,
  );
  return { repo, store, storage };
}

test("create/load/restore use the authenticated UID and stable project ID; logout isolates accounts", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original prompt");
  assert.equal(h.repo.writes[0].uid, "UID-A");
  assert.equal(h.store.state.active?.id, "project-one");
  h.repo.uid = null;
  await h.store.connect(null);
  assert.deepEqual(h.store.state.projects, []);
  assert.equal(h.store.state.active, null);
  h.repo.uid = "UID-B";
  await h.store.connect("UID-B");
  assert.deepEqual(h.store.state.projects, []);
  await assert.rejects(() => h.store.open("project-one"));
  h.repo.uid = "UID-A";
  await h.store.connect("UID-A");
  assert.equal(h.store.state.projects[0].id, "project-one");
  await h.store.open("project-one");
  assert.equal(h.store.state.active?.initialPrompt, "Original prompt");
  assert.deepEqual(h.store.state.active?.snapshot, projectFixture());
  assert.equal(h.repo.writes.length, 1);
});
test("autosave debounces edits and conversation updates, preserves createdAt, and deduplicates snapshots", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original prompt");
  const created = h.store.state.projects[0].createdAt;
  const changed = projectFixture();
  changed.components.button.text = "Updated action";
  changed.messages.push({
    id: "next",
    role: "user",
    content: "Make it blue",
    timestamp: 2,
  });
  h.store.queue(changed);
  changed.components.button.styles.background = "#0000ff";
  h.store.queue(changed);
  h.store.queue(changed);
  await delay(40);
  assert.equal(h.repo.writes.length, 2);
  assert.equal(h.store.state.saves["project-one"], "saved");
  await h.store.open("project-one");
  assert.equal(
    h.store.state.active?.snapshot.components.button.text,
    "Updated action",
  );
  assert.equal(
    h.store.state.active?.snapshot.messages.at(-1)?.content,
    "Make it blue",
  );
  assert.equal(h.store.state.active?.createdAt, created);
});
test("network failure retains the pending draft; retries and browser refresh do not duplicate IDs", async () => {
  const h = harness(10000);
  await h.store.connect("UID-A");
  h.repo.failure = "unavailable";
  await assert.rejects(() =>
    h.store.create(projectFixture(), "Preserved prompt"),
  );
  assert.equal(h.store.state.saves["project-one"], "failed");
  assert.ok(h.storage.getItem("frame.projects.pending.UID-A"));
  h.repo.failure = null;
  const refreshed = new ProjectsStore(
    async () => h.repo,
    () => h.storage,
    10,
  );
  await refreshed.connect("UID-A");
  await refreshed.open("project-one");
  assert.equal(h.repo.rows.size, 1);
  assert.equal(refreshed.state.active?.initialPrompt, "Preserved prompt");
  assert.equal(h.storage.getItem("frame.projects.pending.UID-A"), null);
});
test("rename, favorite, duplicate, delete persist complete project data", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original prompt");
  await h.store.rename("project-one", "Renamed");
  await h.store.favorite("project-one");
  const id = await h.store.duplicate("project-one");
  assert.notEqual(id, "project-one");
  assert.equal(h.repo.rows.get("UID-A/" + id)?.title, "Renamed copy");
  assert.deepEqual(
    h.repo.rows.get("UID-A/" + id)?.snapshot.messages,
    projectFixture().messages,
  );
  await h.store.remove("project-one");
  assert.equal(h.repo.rows.has("UID-A/project-one"), false);
  assert.equal(h.repo.rows.has("UID-A/" + id), true);
});
test("concurrent revision conflicts retain work and can be recovered as a new copy", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original");
  h.repo.rows.get("UID-A/project-one")!.revision++;
  const changed = projectFixture();
  changed.projectName = "Pending edits";
  h.store.queue(changed);
  await assert.rejects(() => h.store.flush());
  assert.ok(h.store.state.error?.includes("another tab"));
  const id = await h.store.recoverAsCopy("project-one");
  assert.ok(id);
  assert.equal(
    h.repo.rows.get("UID-A/" + id)?.snapshot.projectName,
    "Pending edits recovered copy",
  );
  assert.equal(h.repo.rows.get("UID-A/project-one")?.title, "Fitness");
});
test("an account switch during an in-flight save never applies the previous user result", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  let release!: () => void;
  h.repo.hold = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  h.store.queue(projectFixture());
  const saving = h.store.flush();
  h.repo.uid = "UID-B";
  await h.store.connect("UID-B");
  release();
  await assert.rejects(() => saving);
  assert.deepEqual(h.store.state.projects, []);
  assert.equal(h.store.state.active, null);
  assert.ok(h.storage.getItem("frame.projects.pending.UID-A"));
  assert.equal(h.storage.getItem("frame.projects.pending.UID-B"), null);
});
test("auth initialization/loading never permits a save or supplies an arbitrary owner UID", async () => {
  const h = harness();
  assert.throws(() => h.store.queue(projectFixture()));
  h.repo.uid = null;
  await h.store.connect("UID-A");
  assert.equal(h.repo.writes.length, 0);
  assert.throws(() => h.store.queue(projectFixture()));
});
test("chunk encoding preserves the existing design schema, Unicode, and large conversations", () => {
  const snapshot = projectFixture();
  snapshot.messages.push({
    id: "large",
    role: "assistant",
    content: "ગુજરાતી🙂".repeat(35000),
    timestamp: 2,
  });
  const encoded = encodeSnapshot(snapshot);
  assert.ok(encoded.conversation.length > 1);
  for (const data of encoded.conversation)
    assert.ok(new TextEncoder().encode(data).length <= CHUNK_BYTES);
  assert.deepEqual(
    decodeSnapshot(snapshot.projectId, encoded.design, encoded.conversation),
    snapshot,
  );
  assert.throws(() => splitJson({ source: "data:image/png;base64,abc" }));
  assert.throws(() => encodeSnapshot({ ...snapshot, productType: null }));
});
test("failed deletion is retained and can be retried after refresh", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original");
  h.repo.failure = "unavailable";
  await assert.rejects(() => h.store.remove("project-one"));
  assert.ok(h.storage.getItem("frame.projects.deleting.UID-A"));
  assert.equal(h.store.hasPending(), true);
  h.repo.failure = null;
  const refreshed = new ProjectsStore(
    async () => h.repo,
    () => h.storage,
    10,
  );
  await refreshed.connect("UID-A");
  assert.equal(h.repo.rows.size, 0);
  assert.equal(h.storage.getItem("frame.projects.deleting.UID-A"), null);
  assert.equal(refreshed.hasPending(), false);
});
test("a project created before generation starts restores its prompt as a retryable draft", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  const draft = projectFixture();
  delete draft.designSystem;
  draft.components = {};
  draft.screens = [];
  draft.messages = [];
  await h.store.create(draft, "Original ungenerated prompt");
  assert.equal(h.store.state.active?.snapshot.messages.length, 0);
  const refreshed = new ProjectsStore(
    async () => h.repo,
    () => h.storage,
    10,
  );
  await refreshed.connect("UID-A");
  await refreshed.open("project-one");
  assert.equal(
    refreshed.state.active?.snapshot.messages[0].content,
    "Original ungenerated prompt",
  );
  assert.equal(
    refreshed.state.active?.snapshot.messages[1].retryPrompt,
    "Original ungenerated prompt",
  );
});

test("duplicate retry reserves one new project ID instead of creating multiple copies", async () => {
  const h = harness();
  await h.store.connect("UID-A");
  await h.store.create(projectFixture(), "Original");
  const save = h.repo.save.bind(h.repo);
  let fail = true;
  h.repo.save = async (write) => {
    if (fail && write.snapshot.projectId !== "project-one")
      throw { code: "unavailable" };
    return save(write);
  };
  await assert.rejects(() => h.store.duplicate("project-one"));
  assert.equal(h.repo.rows.size, 1);
  fail = false;
  const id = await h.store.duplicate("project-one");
  assert.equal(h.repo.rows.size, 2);
  assert.ok(h.repo.rows.has("UID-A/" + id));
});
