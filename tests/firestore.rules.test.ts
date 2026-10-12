import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { FirestoreProjects } from "../src/projects/firestore";
import { projectFixture } from "./projectFixture";

test(
  "Firestore emulator enforces ownership, field validation, atomic revisions, and repository lifecycle",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    const env = await initializeTestEnvironment({
      projectId: "demo-frame",
      firestore: {
        host,
        port: Number(port),
        rules: await readFile("firestore.rules", "utf8"),
      },
    });
    try {
      await env.clearFirestore();
      const a = env
        .authenticatedContext("UID-A")
        .firestore() as unknown as Firestore;
      const b = env
        .authenticatedContext("UID-B")
        .firestore() as unknown as Firestore;
      const anonymous = env
        .unauthenticatedContext()
        .firestore() as unknown as Firestore;
      const repoA = new FirestoreProjects(a, () => ({ uid: "UID-A" }));
      const repoB = new FirestoreProjects(b, () => ({ uid: "UID-B" }));
      const snapshot = projectFixture();
      const first = await repoA.save({
        snapshot,
        initialPrompt: "Original prompt",
        favorite: false,
        expectedRevision: 0,
        writeId: "revision-one",
      });
      assert.equal(first.revision, 1);
      assert.ok(first.createdAt > 0);
      const loaded = await repoA.load(snapshot.projectId);
      assert.deepEqual(loaded.snapshot, snapshot);
      const root = doc(a, "users", "UID-A", "projects", snapshot.projectId);
      const bAttack = doc(b, "users", "UID-A", "projects", snapshot.projectId);
      await assertFails(getDoc(bAttack));
      await assertFails(updateDoc(bAttack, { title: "Stolen" }));
      await assertFails(deleteDoc(bAttack));
      await assertFails(
        setDoc(doc(b, "users", "UID-A", "projects", "forged"), {
          title: "Forged",
        }),
      );
      await assertFails(
        getDoc(
          doc(anonymous, "users", "UID-A", "projects", snapshot.projectId),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            b,
            "users",
            "UID-A",
            "projects",
            snapshot.projectId,
            "revisions",
            "revision-one",
            "chunks",
            "design-0",
          ),
        ),
      );
      assert.deepEqual(await repoB.list(), []);
      await assert.rejects(() => repoB.load(snapshot.projectId));
      const copied = await repoB.save({
        snapshot,
        initialPrompt: "User B project",
        favorite: false,
        expectedRevision: 0,
        writeId: "b-first",
      });
      assert.equal(copied.id, snapshot.projectId);
      await assertFails(
        getDoc(doc(a, "users", "UID-B", "projects", snapshot.projectId)),
      );
      assert.equal(
        (await repoA.load(snapshot.projectId)).initialPrompt,
        "Original prompt",
      );
      await assertFails(
        updateDoc(root, { extraOwner: "UID-B", updatedAt: serverTimestamp() }),
      );
      await assertFails(
        updateDoc(root, {
          createdAt: serverTimestamp(),
          revision: 2,
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(root, {
          revision: 2,
          initialPrompt: "Overwrite prompt",
          updatedAt: serverTimestamp(),
        }),
      );
      const changed = { ...snapshot, projectName: "Renamed" };
      const second = await repoA.save({
        snapshot: changed,
        initialPrompt: "Original prompt",
        favorite: true,
        expectedRevision: 1,
        writeId: "revision-two",
      });
      assert.equal(second.createdAt, first.createdAt);
      assert.equal(second.revision, 2);
      assert.equal(second.favorite, true);
      const retry = await repoA.save({
        snapshot: changed,
        initialPrompt: "Original prompt",
        favorite: true,
        expectedRevision: 1,
        writeId: "revision-two",
      });
      assert.equal(retry.revision, 2);
      await assert.rejects(() =>
        repoA.save({
          snapshot,
          initialPrompt: "Original prompt",
          favorite: false,
          expectedRevision: 1,
          writeId: "stale-write",
        }),
      );
      await assertFails(
        setDoc(
          doc(
            a,
            "users",
            "UID-A",
            "projects",
            snapshot.projectId,
            "revisions",
            "orphan",
            "chunks",
            "design-0",
          ),
          { kind: "design", index: 0, data: "{}" },
        ),
      );
      await assertSucceeds(getDoc(root));
      await repoA.remove(snapshot.projectId, 2);
      await repoA.remove(snapshot.projectId, 2);
      assert.deepEqual(await repoA.list(), []);
      assert.equal((await repoB.list()).length, 1);
      await assertFails(getDoc(doc(a, "unrelated", "secret")));
    } finally {
      await env.cleanup();
    }
  },
);
