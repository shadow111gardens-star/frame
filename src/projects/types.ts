import type { PersistedState } from "../workspace/store";
import type { ProductType } from "../../shared/product";

export interface ProjectSummary {
  id: string;
  title: string;
  initialPrompt: string;
  projectType: ProductType | null;
  createdAt: number;
  updatedAt: number;
  revision: number;
  favorite: boolean;
  status: "draft" | "ready" | "deleting";
}
export interface LoadedProject extends ProjectSummary {
  snapshot: PersistedState;
}
export interface ProjectWrite {
  snapshot: PersistedState;
  initialPrompt: string;
  favorite: boolean;
  expectedRevision: number;
  writeId: string;
}
export interface ProjectRepository {
  /** The owner comes from the existing authenticated Firebase User, not callers. */
  currentUid(): string | null;
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<LoadedProject>;
  save(write: ProjectWrite): Promise<ProjectSummary>;
  remove(id: string, revision: number): Promise<void>;
  startGeneration?(run:import('./artifacts').GenerationRunStart):Promise<void>;
  updateGeneration?(run:import('./artifacts').GenerationRunStart,stage:import('../../shared/generationProgress').GenerationStage):Promise<void>;
  failGeneration?(run:import('./artifacts').GenerationRunStart,error:{code:string;message:string}):Promise<void>;
}
export function projectError(error: unknown): string {
  switch ((error as { code?: string })?.code) {
    case "permission-denied":
      return "Project access was denied. Check your account and deployed Firestore rules.";
    case "unauthenticated":
      return "Your session changed or expired. Sign in again before saving projects.";
    case "not-found":
      return "This project no longer exists. Return home and reload your projects.";
    case "conflict":
      return "This project changed in another tab. Your pending work is kept on this device. Reload the cloud project before continuing, or save your pending work as a copy.";
    case "unavailable":
    case "deadline-exceeded":
      return "Could not reach Firestore. Your pending work is kept on this device. Check your connection and retry.";
    case "resource-exhausted":
      return "Firestore quota was reached. Your work is kept on this device; retry when the quota is available.";
    case "failed-precondition":
      return "Firestore setup is incomplete. Check that the default database exists and deploy the supplied rules and indexes.";
    case "cancelled":
      return "The Firestore connection was interrupted. Pending work is retained; retry the save.";
    case "aborted":
      return "Firestore could not complete a concurrent update. Pending work is retained; retry the save.";
    default:
      return error instanceof ProjectDataError
        ? error.message
        : "Could not load or save your project. Your pending work is kept on this device. Please retry.";
  }
}
export class ProjectCancelledError extends Error {
  readonly code = "project-cancelled";
  constructor() {
    super(
      "Project operation was superseded or its authenticated account changed.",
    );
    this.name = "ProjectCancelledError";
  }
}
export function isProjectCancellation(error: unknown) {
  return error instanceof ProjectCancelledError;
}
export class ProjectDataError extends Error {
  constructor(
    message: string,
    public code = "invalid-data",
  ) {
    super(message);
  }
}
