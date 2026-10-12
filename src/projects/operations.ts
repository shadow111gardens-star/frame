import { ProjectCancelledError, ProjectDataError } from "./types";

const codes = new Set([
  "permission-denied",
  "unauthenticated",
  "not-found",
  "unavailable",
  "deadline-exceeded",
  "resource-exhausted",
  "failed-precondition",
  "aborted",
  "cancelled",
  "conflict",
]);
/** Observe SDK promises locally; never suppress global AbortErrors or errors
 * from unrelated fetches. An account-change cancellation is expected, whereas
 * an SDK transport interruption for the active account remains a visible failure.
 */
export async function runProjectOperation<T>(
  operation: string,
  uid: string,
  currentUid: () => string | null,
  work: () => Promise<T>,
  log: (details: Record<string, unknown>) => void = (details) =>
    console.info("[FRAME Firestore operation]", JSON.stringify(details)),
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (currentUid() !== uid) throw new ProjectCancelledError();
    try {
      const result = await work();
      if (currentUid() !== uid) throw new ProjectCancelledError();
      return result;
    } catch (error) {
      if (currentUid() !== uid || error instanceof ProjectCancelledError) {
        log({ event: "cancelled", operation, reason: "account_changed" });
        throw new ProjectCancelledError();
      }
      if ((error as { name?: string })?.name === "AbortError") {
        log({
          event: "transport_cancelled",
          operation,
          attempt: attempt + 1,
          retrying: attempt === 0,
        });
        if (attempt === 0) continue;
        throw new ProjectDataError(
          "The Firestore connection was interrupted. Pending work is retained; retry the save.",
          "cancelled",
        );
      }
      const code = (error as { code?: string })?.code;
      log({
        event: "failed",
        operation,
        code: code && codes.has(code) ? code : "project-error",
      });
      throw error;
    }
  }
  throw new ProjectDataError(
    "The Firestore connection was interrupted.",
    "cancelled",
  );
}
