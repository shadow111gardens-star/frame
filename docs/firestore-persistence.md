# FRAME Step 2: Firestore persistence

Step 2 reuses the existing Firebase app and Google authentication. Firebase web configuration and the Google popup flow are unchanged. Firestore uses `getFirestore(initializeFrameFirebase())` in `src/projects/firestore.ts`.

## Changed files

Created `src/projects/types.ts`, `codec.ts`, `firestore.ts`, `store.ts`, and `ProjectsProvider.tsx`; `firestore.rules`, `firestore.indexes.json`, and `firebase.json`; `tests/projectFixture.ts`, `projects.test.ts`, `projectIntegration.test.tsx`, and `firestore.rules.test.ts`; and this guide.

Modified `src/main.tsx` and `src/App.tsx`; `src/home/store.tsx` and its PromptBox, Sidebar, ProjectMenu, and LogoutConfirm components; `src/workspace/store.tsx` and its ProjectMenu, TopBar, and StatusBar components; `package.json`, `package-lock.json`, and README. Existing authentication SDK files, AI API/model configuration, and design schema files were not modified.

## Ownership and schema

Every repository operation reads the current Firebase User from the existing `getAuth(app).currentUser`. There is no owner UID parameter in create, save, open, rename, duplicate, favorite, or delete APIs. Async operations also reject account changes before applying their results. `ProjectsProvider` uses the existing auth context, without another Firebase auth listener.

```text
users/{actualFirebaseUID}/projects/{stableProjectID}
  title: string
  initialPrompt: string
  projectType: mobile_app | website | null
  designDocument: { encoding: frame-json-v1, chunkCount: number }
  conversationHistory: { encoding: frame-json-v1, chunkCount: number }
  snapshotId: unique write/revision identifier
  revision: monotonically increasing integer
  status: draft | ready | deleting
  favorite: boolean
  createdAt: Firestore server timestamp
  updatedAt: Firestore server timestamp
  revisions/{snapshotId}
    revision, createdAt
    chunks/design-{index}: { kind: design, index, data: JSON text }
    chunks/conversation-{index}: { kind: conversation, index, data: JSON text }
```

The design JSON is the existing `PersistedState` schema: project ID/name/type, design system, screens, components, files, tokens, device, current screen, selected component/file, and editor view preferences. Conversation chunks contain the existing ChatMessage records including user prompts, assistant responses, tasks, retry information, and attachment metadata. This is serialization of FRAME state, not a replacement design schema.

JSON is split into UTF-8 chunks of at most 240 KB so designs and growing conversations do not hit the 1 MiB Firestore document limit, map nesting limits, or nested-array restrictions. A revision is committed atomically with its root pointers and chunk documents. A 6 MB total application limit keeps saves below Firestore transaction-size limits. Oversized or binary-containing snapshots show Save failed and retain pending work. Remote asset URLs remain unchanged. No Firebase Storage uploads were added. Temporary blob URLs and embedded data URLs must be replaced with hosted assets before cloud save; the current project is not silently stripped of them.

Revision data is immutable. Older revisions are retained until project deletion, which first marks the root deleting, removes all revision/chunk documents, then removes the root. Failed deletions are journaled and retried safely. Retained revisions consume storage; production retention/garbage collection can be added separately without deleting the current revision or racing readers.

## Application behavior

- Home loads only the authenticated user's project summaries, retaining its existing empty/list UI and project menu. Loading and errors are shown.
- Home prompt submission reserves one stable project ID and saves the draft/prompt before entering the existing workspace generation flow. Retry uses the same ID instead of creating duplicate projects.
- Saved projects open by their ID and load their existing snapshots. The active project ID is stored locally under a UID-specific key to support `#workspace` refresh.
- The real editor snapshot feeds an 800 ms debounced autosave queue. Completed designs are validated against FRAME's existing schema; unfinished generation never becomes successful completed design output. Prompts, AI responses, edits, screens, view state, and file edits are saved.
- Existing save indicators report Saving, Saved, or Save failed based on cloud acknowledgement, with Retry. Rename, duplicate, delete, and favorite persist through existing controls.
- Before a network save, pending work is journaled to `frame.projects.pending.{uid}` in localStorage. Failed deletion IDs/revisions use `frame.projects.deleting.{uid}`. These journals are scoped to the Firebase UID and replayed only for that same account. Shared legacy browser-memory projects are not automatically uploaded or exposed to another account.
- Navigation flushes the page-lifetime queue. Before closing a page with pending work, the browser warns; the journal survives reload when browser storage is available. Logout waits for pending saves/deletions. A failed save retains the session so work can be retried or recovered.
- Stale revision updates fail instead of overwriting another tab. The error offers Save pending work as copy. The new copy has a new project ID; the original cloud revision is preserved.
- Refresh never reruns successful generation. Interrupted generation restores the last valid design and a retryable prompt. Drafts created before generation started also restore their initial prompt.

If browser storage is disabled/full, the app warns that device recovery is unavailable. Keep the page open until Saved is confirmed. No browser can guarantee delivery of async Firestore requests during a forced process exit.

## Required Firebase setup and deployment

Production database existence, region, published rules, and actual authenticated writes have **not** been verified from this session. No production settings, billing plan, or Firebase services were changed automatically.

1. Open the existing `frame-44bbd` project in [Firebase Console](https://console.firebase.google.com/project/frame-44bbd/firestore).
2. If its default Cloud Firestore database does not exist, choose **Create database**, Native/Standard Firestore, and **production mode**. Choose the desired location carefully; location cannot simply be changed later. Use the existing project's available free quota; do not enable paid services for this task.
3. In Firestore Database > **Rules**, replace the entire rules text with the complete contents of `firestore.rules`, then click **Publish**. Do not select test/open rules. These rules require `request.auth.uid == uid`, validate project fields/timestamps/revisions, protect nested revisions/chunks, preserve createdAt, and deny unrelated paths by default.
4. Deploy `firestore.indexes.json` as well, using the CLI below. It exempts large chunk data from indexing; listing/opening projects requires no composite index.

CLI alternative from this repository:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project frame-44bbd
```

This configuration deploys Firestore rules/indexes only; it does not deploy hosting, create a new Firebase project, or change authentication/billing. No service-account or Admin keys are needed in the frontend.

Rules reference: [Firebase field validation](https://firebase.google.com/docs/firestore/security/rules-fields). Storage and transaction limits: [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Verification and live acceptance

The standard suite covers the existing app plus mocked persistence and a rendered integration flow. The dedicated rules test uses the real Firestore Emulator and actual Firebase client SDK repository, covering own-user reads/writes, atomic revisions, createdAt preservation, idempotent retry, stale updates, deletion, and denied anonymous/cross-user/unrelated access. Emulator tests are distinct from production connectivity.

```powershell
npm test
npm run typecheck
npm run build
# Install Java 21+ for the emulator and ensure java is on PATH:
npx firebase-tools emulators:exec --only firestore --project demo-frame "npm run test:rules"
```

The rules test is skipped by `npm test` unless FIRESTORE_EMULATOR_HOST is set. It was separately run and passed against a local demo-frame emulator; it never touched production data. Local emulator CLI/JRE downloads and logs are in ignored `artifacts/firestore-emulator/`.

Verification results: 99 standard tests passed, with the one emulator-only test skipped in that run. That test passed separately with the real emulator. TypeScript and production build passed. Existing Zod annotation warnings are nonfatal. `npm audit` reports 10 dependency advisories (9 high, 1 low), including Firebase's Node gRPC dependency chain and existing Vite/build tooling. No broad unrelated dependency upgrades were performed; the gRPC advisories concern the Node transport rather than the browser Firestore bundle.

Actual production Firestore writes/reads have **not** been verified. After publishing the rules, sign in as User A, create/generate a project, wait for Saved, edit/rename it, refresh, reopen it, and check `users/{UID_A}/projects/{id}` in Console. Test duplication/deletion and confirm chunks are removed on delete. Sign out, sign in as User B, and confirm A's projects are absent; return as A and confirm they reload. Test denied network/save retries and stale edits from a second tab. No Google credentials or privileged secrets were requested or entered by the agent.

No Git commit or push was performed. Existing model configuration, AI generation implementation, landing design, and editor renderer were retained.
