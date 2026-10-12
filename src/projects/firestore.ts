import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  writeBatch,
  serverTimestamp,
  type Firestore,
  type DocumentData,
} from "firebase/firestore";
import { initializeFrameFirebase } from "../auth/firebase";
import { encodeSnapshot, decodeSnapshot } from "./codec";
import {
  ProjectDataError,
  type ProjectRepository,
  type ProjectSummary,
  type ProjectWrite,
} from "./types";

function summary(id: string, data: DocumentData): ProjectSummary {
  return {
    id,
    title: data.title,
    initialPrompt: data.initialPrompt,
    projectType: data.projectType,
    favorite: data.favorite,
    status: data.status,
    revision: data.revision,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
    updatedAt: data.updatedAt?.toMillis?.() ?? 0,
  };
}
export class FirestoreProjects implements ProjectRepository {
  constructor(
    private db: Firestore,
    private user: () => { uid: string } | null,
  ) {}
  currentUid() {
    return this.user()?.uid ?? null;
  }
  private scope(id?: string) {
    const uid = this.currentUid();
    if (!uid)
      throw new ProjectDataError(
        "Sign in before accessing projects.",
        "unauthenticated",
      );
    if (id && !/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw new ProjectDataError("Invalid project ID.", "not-found");
    const projects = collection(this.db, "users", uid, "projects");
    return { uid, projects, ref: id ? doc(projects, id) : undefined };
  }
  private assertOwner(uid: string) {
    if (this.currentUid() !== uid)
      throw new ProjectDataError(
        "The account changed while accessing the project.",
        "unauthenticated",
      );
  }
  async list() {
    const { uid, projects } = this.scope();
    const result = await getDocsFromServer(projects);
    this.assertOwner(uid);
    return result.docs.map((item) => summary(item.id, item.data()));
  }
  async load(id: string) {
    const { uid, ref } = this.scope(id);
    const result = await getDocFromServer(ref!);
    if (!result.exists() || result.data().status === "deleting")
      throw new ProjectDataError("Project not found.", "not-found");
    const data = result.data();
    const revision = doc(ref!, "revisions", data.snapshotId);
    const chunks = await getDocsFromServer(collection(revision, "chunks"));
    this.assertOwner(uid);
    const read = (kind: string, count: number) => {
      const parts = chunks.docs
        .map((d) => d.data())
        .filter((d) => d.kind === kind)
        .sort((a, b) => a.index - b.index);
      if (
        parts.length !== count ||
        parts.some((p, i) => p.index !== i || typeof p.data !== "string")
      )
        throw new ProjectDataError(
          "The saved project is incomplete. Reload or contact support; your current work is retained.",
        );
      return parts.map((p) => p.data as string);
    };
    return {
      ...summary(id, data),
      snapshot: decodeSnapshot(
        id,
        read("design", data.designDocument.chunkCount),
        read("conversation", data.conversationHistory.chunkCount),
      ),
    };
  }
  async save(write: ProjectWrite) {
    const { uid, ref } = this.scope(write.snapshot.projectId);
    if (
      typeof write.initialPrompt !== "string" ||
      write.initialPrompt.length > 50000
    )
      throw new ProjectDataError(
        "The initial prompt exceeds the 50,000 character cloud-save limit. Shorten it before retrying.",
      );
    if (!Number.isInteger(write.expectedRevision) || write.expectedRevision < 0)
      throw new ProjectDataError(
        "Invalid project revision. Reload the cloud project before saving.",
      );
    const encoded = encodeSnapshot(write.snapshot);
    if (
      new TextEncoder().encode(
        [...encoded.design, ...encoded.conversation].join(""),
      ).length > 6_000_000
    )
      throw new ProjectDataError(
        "This project exceeds the 6 MB atomic save limit. Reduce its size before saving.",
      );
    await runTransaction(this.db, async (transaction) => {
      const existing = await transaction.get(ref!);
      this.assertOwner(uid);
      const old = existing.data();
      if (old?.snapshotId === write.writeId) return; // Retry an uncertain acknowledgement safely.
      if (
        (old?.revision ?? 0) !== write.expectedRevision ||
        old?.status === "deleting"
      )
        throw new ProjectDataError("Concurrent project update.", "conflict");
      const revision = doc(ref!, "revisions", write.writeId);
      transaction.set(revision, {
        createdAt: serverTimestamp(),
        revision: write.expectedRevision + 1,
      });
      for (const kind of ["design", "conversation"] as const) {
        encoded[kind].forEach((data, index) =>
          transaction.set(doc(revision, "chunks", `${kind}-${index}`), {
            kind,
            index,
            data,
          }),
        );
      }
      transaction.set(ref!, {
        title: write.snapshot.projectName || "Untitled project",
        initialPrompt: old?.initialPrompt || write.initialPrompt,
        projectType: write.snapshot.productType,
        designDocument: {
          encoding: "frame-json-v1",
          chunkCount: encoded.design.length,
        },
        conversationHistory: {
          encoding: "frame-json-v1",
          chunkCount: encoded.conversation.length,
        },
        snapshotId: write.writeId,
        revision: write.expectedRevision + 1,
        status: encoded.status,
        favorite: write.favorite,
        createdAt: old?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    this.assertOwner(uid);
    const saved = await getDocFromServer(ref!);
    this.assertOwner(uid);
    if (!saved.exists())
      throw new ProjectDataError("Project not found.", "not-found");
    const data = saved.data();
    if (data.snapshotId !== write.writeId)
      throw new ProjectDataError("Concurrent project update.", "conflict");
    return summary(ref!.id, data);
  }
  async remove(id: string, expectedRevision: number) {
    const { uid, ref } = this.scope(id);
    const marked = await runTransaction(this.db, async (transaction) => {
      const current = await transaction.get(ref!);
      this.assertOwner(uid);
      if (!current.exists()) return false;
      if (current.data().revision !== expectedRevision)
        throw new ProjectDataError("Concurrent project update.", "conflict");
      transaction.update(ref!, {
        status: "deleting",
        updatedAt: serverTimestamp(),
      });
      return true;
    });
    if (!marked) return;
    // Firestore deleting a parent does not delete its subcollections.
    const revisions = await getDocsFromServer(collection(ref!, "revisions"));
    for (const revision of revisions.docs) {
      const chunks = await getDocsFromServer(
        collection(revision.ref, "chunks"),
      );
      this.assertOwner(uid);
      const batch = writeBatch(this.db);
      chunks.docs.forEach((chunk) => batch.delete(chunk.ref));
      batch.delete(revision.ref);
      await batch.commit();
    }
    this.assertOwner(uid);
    const batch = writeBatch(this.db);
    batch.delete(ref!);
    await batch.commit();
  }
}
let instance: FirestoreProjects | undefined;
export function firestoreProjects() {
  if (!instance) {
    const app = initializeFrameFirebase();
    const auth = getAuth(app);
    instance = new FirestoreProjects(getFirestore(app), () => auth.currentUser);
  }
  return instance;
}
