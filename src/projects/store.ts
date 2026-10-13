import type { PersistedState } from "../workspace/store";
import {
  projectError,
  ProjectDataError,
  ProjectCancelledError,
  isProjectCancellation,
  type LoadedProject,
  type ProjectRepository,
  type ProjectSummary,
  type ProjectWrite,
} from "./types";

interface Pending extends ProjectWrite {}
export interface ProjectsState {
  uid: string | null;
  loading: boolean;
  opening: boolean;
  projects: ProjectSummary[];
  active: LoadedProject | null;
  error: string | null;
  saves: Record<string, "saving" | "saved" | "failed">;
}
export class ProjectsStore {
  private generationEpochs=new Map<string,number>();
  state: ProjectsState = {
    uid: null,
    loading: false,
    opening: false,
    projects: [],
    active: null,
    error: null,
    saves: {},
  };
  private listeners = new Set<() => void>();
  private repo?: ProjectRepository;
  private epoch = 0;
  private startup?: Promise<void>;
  private pending = new Map<string, Pending>();
  private flights = new Map<string, Promise<void>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private fingerprints = new Map<string, string>();
  private deletions = new Map<string, number>();
  private duplicates = new Map<string, string>();
  private openings = new Map<string, Promise<void>>();
  private selection = 0;
  constructor(
    private load: () => Promise<ProjectRepository>,
    private storage: () => Storage | undefined,
    private debounceMs = 800,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  private update(patch: Partial<ProjectsState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private journalKey() {
    return `frame.projects.pending.${this.state.uid}`;
  }
  private journalDeletes() {
    try {
      if (!this.storage() && this.deletions.size)
        throw new Error("Recovery storage unavailable");
      const key = `frame.projects.deleting.${this.state.uid}`;
      if (this.deletions.size)
        this.storage()?.setItem(key, JSON.stringify([...this.deletions]));
      else this.storage()?.removeItem(key);
    } catch {
      this.update({
        error:
          "Device recovery storage is unavailable. Keep this page open until project deletion completes.",
      });
    }
  }
  private journal() {
    try {
      if (!this.storage() && this.pending.size)
        throw new Error("Recovery storage unavailable");
      if (this.pending.size)
        this.storage()?.setItem(
          this.journalKey(),
          JSON.stringify([...this.pending]),
        );
      else this.storage()?.removeItem(this.journalKey());
    } catch {
      this.update({
        error:
          "Device recovery storage is unavailable. Keep this page open until Firestore confirms Saved.",
      });
    }
  }
  activeId() {
    try {
      return (
        this.storage()?.getItem(`frame.projects.active.${this.state.uid}`) ??
        null
      );
    } catch {
      return null;
    }
  }
  connect(uid: string | null) {
    if (uid === this.state.uid && this.startup) return this.startup;
    this.epoch++;
    this.selection++;
    this.openings.clear();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.pending.clear();
    this.flights.clear();
    this.fingerprints.clear();
    this.generationEpochs.clear();
    this.deletions.clear();
    this.duplicates.clear();
    this.repo = undefined;
    this.update({
      uid,
      loading: !!uid,
      opening: false,
      projects: [],
      active: null,
      error: null,
      saves: {},
    });
    const epoch = this.epoch;
    this.startup = (async () => {
      if (!uid) return;
      try {
        const repo = await this.load();
        if (epoch !== this.epoch) return;
        if (repo.currentUid() !== uid)
          throw new ProjectDataError(
            "Authentication not ready.",
            "unauthenticated",
          );
        this.repo = repo;
        // Recover only this account's journal; never import anonymous/shared work.
        try {
          const raw = this.storage()?.getItem(this.journalKey());
          if (raw)
            for (const [id, write] of JSON.parse(raw) as [string, Pending][]) {
              if (write.snapshot.projectId === id) this.pending.set(id, write);
            }
          const deleting = this.storage()?.getItem(
            `frame.projects.deleting.${uid}`,
          );
          if (deleting)
            for (const [id, revision] of JSON.parse(deleting) as [
              string,
              number,
            ][])
              this.deletions.set(id, revision);
        } catch {
          this.update({
            error:
              "Pending project recovery data could not be read. Reload before closing this page.",
          });
        }
        const projects = await repo.list();
        if (epoch !== this.epoch) return;
        this.update({ projects, loading: false });
        if (this.pending.size) await this.flush();
        await this.flushDeletes();
      } catch (error) {
        if (epoch === this.epoch)
          this.update({ loading: false, error: projectError(error) });
      }
    })();
    return this.startup;
  }
  private owned() {
    if (
      !this.state.uid ||
      !this.repo ||
      this.repo.currentUid() !== this.state.uid
    )
      throw new ProjectDataError("Authentication required.", "unauthenticated");
    return this.repo;
  }
  private checkEpoch(epoch: number) {
    if (epoch !== this.epoch) throw new ProjectCancelledError();
  }
  private put(summary: ProjectSummary) {
    this.update({
      projects: [
        summary,
        ...this.state.projects.filter((p) => p.id !== summary.id),
      ],
    });
  }
  queue(snapshot: PersistedState, initialPrompt?: string, favorite?: boolean) {
    this.owned();
    const clean = JSON.parse(JSON.stringify(snapshot)) as PersistedState;
    const old = this.state.projects.find((p) => p.id === clean.projectId);
    const prior = this.pending.get(clean.projectId);
    const prompt =
      old?.initialPrompt ||
      initialPrompt ||
      prior?.initialPrompt ||
      clean.messages.find((m) => m.role === "user")?.content ||
      "";
    const fingerprint = JSON.stringify([
      clean,
      prompt,
      favorite ?? old?.favorite ?? prior?.favorite ?? false,
    ]);
    if (this.fingerprints.get(clean.projectId) === fingerprint) return;
    this.fingerprints.set(clean.projectId, fingerprint);
    const write: Pending = {
      snapshot: clean,
      initialPrompt: prompt,
      favorite: favorite ?? old?.favorite ?? prior?.favorite ?? false,
      expectedRevision: prior?.expectedRevision ?? old?.revision ?? 0,
      writeId: clean.generationArtifact&&prior?.snapshot.generationArtifact?.generationRunId!==clean.generationArtifact.generationRunId&&this.state.active?.snapshot.generationArtifact?.generationRunId!==clean.generationArtifact.generationRunId?"generation-"+clean.generationArtifact.generationRunId:crypto.randomUUID(),
    };
    this.pending.set(clean.projectId, write);
    this.journal(); // Retain pending work before scheduling any network operation.
    this.update({
      saves: { ...this.state.saves, [clean.projectId]: "saving" },
    });
    const timer = this.timers.get(clean.projectId);
    if (timer) clearTimeout(timer);
    this.timers.set(
      clean.projectId,
      setTimeout(() => {
        void this.saveOne(clean.projectId).catch(() => {});
      }, this.debounceMs),
    );
  }
  async startGeneration(run:import('./artifacts').GenerationRunStart){
    const epoch=this.epoch,repo=this.owned();this.generationEpochs.set(run.generationRunId,epoch);
    await this.flush();
    this.checkEpoch(epoch);await repo.startGeneration?.(run);this.checkEpoch(epoch);
  }
  async updateGeneration(run:import('./artifacts').GenerationRunStart,stage:import('../../shared/generationProgress').GenerationStage,cost?:import('../../shared/generationCost').GenerationCost){const epoch=this.generationEpochs.get(run.generationRunId);if(epoch===undefined)throw new ProjectCancelledError();this.checkEpoch(epoch);await this.owned().updateGeneration?.(run,stage,cost);this.checkEpoch(epoch);}
  async failGeneration(run:import('./artifacts').GenerationRunStart,error:{code:string;message:string;cost?:import('../../shared/generationCost').GenerationCost}){
    const epoch=this.generationEpochs.get(run.generationRunId);if(epoch===undefined)throw new ProjectCancelledError();this.checkEpoch(epoch);
    try{await this.owned().failGeneration?.(run,error);this.checkEpoch(epoch);}finally{this.generationEpochs.delete(run.generationRunId);}
  }
  private saveOne(id: string): Promise<void> {
    const flight = this.flights.get(id);
    if (flight) return flight;
    const epoch = this.epoch;
    let complete!: () => void, fail!: (error: unknown) => void;
    const operation = new Promise<void>((resolve, reject) => {
      complete = resolve;
      fail = reject;
    });
    this.flights.set(id, operation);
    void (async () => {
      try {
        while (this.pending.has(id) && epoch === this.epoch) {
          const write = this.pending.get(id)!;
          const saved = await this.owned().save(write);
          if (epoch !== this.epoch) return;
          this.put(saved);
          if(write.snapshot.generationArtifact)this.generationEpochs.delete(write.snapshot.generationArtifact.generationRunId);
          const latest = this.pending.get(id);
          if (latest?.writeId === write.writeId) this.pending.delete(id);
          else if (latest) latest.expectedRevision = saved.revision;
          if (!this.state.active || this.state.active.id === id) {
            this.update({
              active: {
                ...saved,
                snapshot: latest?.snapshot ?? write.snapshot,
              },
            });
            try {
              this.storage()?.setItem(
                `frame.projects.active.${this.state.uid}`,
                id,
              );
            } catch {}
          }
          this.journal();
        }
        if (epoch === this.epoch)
          this.update({
            error: null,
            saves: { ...this.state.saves, [id]: "saved" },
          });
      } catch (error) {
        if (epoch !== this.epoch) throw new ProjectCancelledError();
        if (epoch === this.epoch)
          this.update({
            error: isProjectCancellation(error) ? null : projectError(error),
            saves: { ...this.state.saves, [id]: "failed" },
          });
        throw error;
      } finally {
        if (epoch === this.epoch) this.flights.delete(id);
      }
    })().then(complete, fail);
    return operation;
  }
  async flush() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    await Promise.all(
      [...new Set([...this.pending.keys(), ...this.flights.keys()])].map((id) =>
        this.saveOne(id),
      ),
    );
  }
  hasPending() {
    return this.pending.size > 0 || this.deletions.size > 0;
  }
  report(error: unknown) {
    if (isProjectCancellation(error)) return;
    this.update({ error: projectError(error) });
  }
  async retry() {
    await this.flush();
    await this.flushDeletes();
    await this.reload();
  }
  async settleAll() {
    await this.flush();
    await this.flushDeletes();
  }
  async reload() {
    const epoch = this.epoch;
    this.update({ loading: true, error: null });
    try {
      const projects = await this.owned().list();
      this.checkEpoch(epoch);
      this.update({ projects, loading: false });
    } catch (error) {
      if (epoch !== this.epoch) throw new ProjectCancelledError();
      if (epoch === this.epoch)
        this.update({
          loading: false,
          error: isProjectCancellation(error) ? null : projectError(error),
        });
      throw error;
    }
  }
  async create(snapshot: PersistedState, prompt = "") {
    const epoch = this.epoch;
    this.queue(snapshot, prompt);
    await this.flush();
    this.checkEpoch(epoch);
    await this.open(snapshot.projectId, { fresh: true });
    return snapshot.projectId;
  }
  open(id: string, options: { fresh?: boolean } = {}): Promise<void> {
    const key = this.epoch + "|" + id + "|" + !!options.fresh;
    const existing = this.openings.get(key);
    if (existing) return existing;
    const epoch = this.epoch;
    const selection = ++this.selection;
    this.update({ opening: true, error: null });
    const operation = Promise.resolve().then(async () => {
      try {
        await this.flush();
        this.checkEpoch(epoch);
        const project = await this.owned().load(id);
        if (epoch !== this.epoch || selection !== this.selection)
          throw new ProjectCancelledError();
        const loadedFingerprint = JSON.stringify([
          project.snapshot,
          project.initialPrompt,
          project.favorite,
        ]);
        if (
          !options.fresh &&
          !project.snapshot.messages.length &&
          !Object.keys(project.snapshot.components).length &&
          project.initialPrompt
        ) {
          project.snapshot.messages = [
            {
              id: crypto.randomUUID(),
              role: "user",
              timestamp: Date.now(),
              content: project.initialPrompt,
            },
            {
              id: crypto.randomUUID(),
              role: "assistant",
              timestamp: Date.now(),
              content:
                "Your project was created before generation completed. Retry your prompt to continue.",
              retryable: true,
              retryPrompt: project.initialPrompt,
              retryProductType: project.projectType ?? undefined,
              retryModify: false,
            },
          ];
        }
        // Interrupted generation is a recoverable conversation, not a finished design.
        if (
          project.snapshot.messages.some((m) =>
            m.tasks?.some((t) => t.status === "active"),
          )
        ) {
          project.snapshot.messages = project.snapshot.messages.map((m) => ({
            ...m,
            tasks: m.tasks?.map((t) => ({
              ...t,
              status: t.status === "active" ? ("pending" as const) : t.status,
            })),
          }));
          project.snapshot.messages.push({
            id: crypto.randomUUID(),
            role: "assistant",
            timestamp: Date.now(),
            content:
              "Generation was interrupted. Your last saved design is preserved. Retry your prompt to continue.",
            retryable: true,
            retryPrompt:
              project.snapshot.messages.filter((m) => m.role === "user").at(-1)
                ?.content || project.initialPrompt,
            retryModify: !!Object.keys(project.snapshot.components).length,
            retryProductType: project.projectType ?? undefined,
          });
        }
        this.fingerprints.set(id, loadedFingerprint);
        this.put(project);
        this.update({
          active: project,
          opening: false,
          saves: { ...this.state.saves, [id]: "saved" },
        });
        try {
          this.storage()?.setItem(
            `frame.projects.active.${this.state.uid}`,
            id,
          );
        } catch {}
      } catch (error) {
        if (epoch !== this.epoch || selection !== this.selection)
          throw new ProjectCancelledError();
        if (epoch === this.epoch)
          this.update({
            opening: false,
            error: isProjectCancellation(error) ? null : projectError(error),
          });
        throw error;
      } finally {
        if (this.openings.get(key) === operation) this.openings.delete(key);
      }
    });
    this.openings.set(key, operation);
    return operation;
  }
  async rename(id: string, title: string) {
    const epoch = this.epoch;
    await this.flush();
    this.checkEpoch(epoch);
    const project = await this.owned().load(id);
    this.checkEpoch(epoch);
    this.queue(
      { ...project.snapshot, projectName: title.trim() || "Untitled project" },
      project.initialPrompt,
      project.favorite,
    );
    await this.flush();
  }
  async favorite(id: string) {
    const epoch = this.epoch;
    await this.flush();
    this.checkEpoch(epoch);
    const project = await this.owned().load(id);
    this.checkEpoch(epoch);
    this.queue(project.snapshot, project.initialPrompt, !project.favorite);
    await this.flush();
  }
  async duplicate(id: string) {
    const epoch = this.epoch;
    await this.flush();
    this.checkEpoch(epoch);
    const reserved = this.duplicates.get(id);
    if (reserved && this.state.projects.some((p) => p.id === reserved)) {
      this.duplicates.delete(id);
      return reserved;
    }
    const project = await this.owned().load(id);
    this.checkEpoch(epoch);
    const snapshot = {
      ...project.snapshot,
      projectId: this.duplicates.get(id) ?? crypto.randomUUID(),
      projectName: project.title.slice(0, 195) + " copy",
      selectedComponentId: null,
      selectedFileId: null,
    };
    this.duplicates.set(id, snapshot.projectId);
    this.queue(snapshot, project.initialPrompt, false);
    await this.flush();
    this.checkEpoch(epoch);
    this.duplicates.delete(id);
    return snapshot.projectId;
  }
  async remove(id: string) {
    const epoch = this.epoch;
    await this.flush();
    this.checkEpoch(epoch);
    const project = this.state.projects.find((p) => p.id === id);
    if (!project) throw new ProjectDataError("Project not found.", "not-found");
    this.deletions.set(id, project.revision);
    this.journalDeletes();
    await this.deleteOne(id, project.revision);
  }
  private async flushDeletes() {
    for (const [id, revision] of [...this.deletions])
      await this.deleteOne(id, revision);
  }
  private async deleteOne(id: string, revision: number) {
    const epoch = this.epoch;
    try {
      await this.owned().remove(id, revision);
      if (epoch !== this.epoch) return;
      this.deletions.delete(id);
      this.journalDeletes();
      this.fingerprints.delete(id);
      this.update({
        projects: this.state.projects.filter((p) => p.id !== id),
        active: this.state.active?.id === id ? null : this.state.active,
        error: null,
      });
      if (this.activeId() === id)
        try {
          this.storage()?.removeItem(`frame.projects.active.${this.state.uid}`);
        } catch {}
    } catch (error) {
      if (epoch !== this.epoch) throw new ProjectCancelledError();
      if (epoch === this.epoch) this.update({ error: projectError(error) });
      throw error;
    }
  }
  // A conflict never overwrites someone else's revision. Explicitly keep a copy.
  async recoverAsCopy(id: string) {
    const pending = this.pending.get(id);
    if (!pending) return;
    const copy = {
      ...pending.snapshot,
      projectId: crypto.randomUUID(),
      projectName:
        pending.snapshot.projectName.slice(0, 185) + " recovered copy",
    };
    this.pending.delete(id);
    this.fingerprints.delete(id);
    this.journal();
    this.queue(copy, pending.initialPrompt, pending.favorite);
    await this.flush();
    return copy.projectId;
  }
}
