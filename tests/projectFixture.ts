import type { PersistedState } from "../src/workspace/store";
import { fixture } from "./fixture";
import type {
  ProjectRepository,
  ProjectWrite,
  LoadedProject,
} from "../src/projects/types";
export function projectFixture(id = "project-one"): PersistedState {
  const app = fixture();
  return {
    projectId: id,
    projectName: app.name,
    productType: app.productType,
    designSystem: app.designSystem,
    device: "iphone-17",
    currentScreen: "home",
    selectedComponentId: null,
    selectedFileId: null,
    screens: app.screens.map((s) => ({
      ...s,
      label: s.name,
      components: s.components.map((c) => c.id),
      createdAt: 0,
    })),
    components: Object.fromEntries(
      app.screens.flatMap((s) => s.components.map((c) => [c.id, c])),
    ),
    files: [],
    tokens: { ...app.designSystem.colors, radius: 16 },
    messages: [
      {
        id: "initial",
        role: "user",
        content: "Create a fitness app",
        timestamp: 1,
      },
    ],
  };
}
export function memoryStorage() {
  const values = new Map<string, string>();
  return Object.assign(
    {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    },
    { values },
  ) as unknown as Storage;
}
export class MemoryProjects implements ProjectRepository {
  uid: string | null = "UID-A";
  rows = new Map<string, LoadedProject>();
  writes: { uid: string; write: ProjectWrite }[] = [];
  failure: string | null = null;
  hold?: () => Promise<void>;
  currentUid() {
    return this.uid;
  }
  private key(id: string) {
    if (!this.uid) throw { code: "unauthenticated" };
    return this.uid + "/" + id;
  }
  async list() {
    if (this.failure) throw { code: this.failure };
    return [...this.rows.entries()]
      .filter(([key]) => key.startsWith(this.uid + "/"))
      .map(([, row]) => structuredClone(row));
  }
  async load(id: string) {
    if (this.failure) throw { code: this.failure };
    const row = this.rows.get(this.key(id));
    if (!row) throw { code: "not-found" };
    return structuredClone(row);
  }
  async save(write: ProjectWrite) {
    const key = this.key(write.snapshot.projectId),
      uid = this.uid!;
    if (this.hold) await this.hold();
    if (this.failure) throw { code: this.failure };
    if (this.uid !== uid) throw { code: "unauthenticated" };
    const old = this.rows.get(key);
    if ((old?.revision ?? 0) !== write.expectedRevision)
      throw { code: "conflict" };
    const row: LoadedProject = {
      id: write.snapshot.projectId,
      title: write.snapshot.projectName,
      initialPrompt: old?.initialPrompt || write.initialPrompt,
      projectType: write.snapshot.productType,
      revision: write.expectedRevision + 1,
      createdAt: old?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      favorite: write.favorite,
      status: Object.keys(write.snapshot.components).length ? "ready" : "draft",
      snapshot: structuredClone(write.snapshot),
    };
    this.writes.push({ uid, write: structuredClone(write) });
    this.rows.set(key, row);
    return structuredClone(row);
  }
  async remove(id: string, revision: number) {
    if (this.failure) throw { code: this.failure };
    const key = this.key(id);
    if (this.rows.get(key)?.revision !== revision) throw { code: "conflict" };
    this.rows.delete(key);
  }
}
