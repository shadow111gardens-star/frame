# FRAME fixed generation workflow

The supplied `FRAME-fixed-generation-flow.json` is unchanged. The editable app JSON schema in `shared/design.ts` is unchanged. This implementation extends the existing React/Node/Gemini/Firebase client architecture; no admin SDK, worker, generation queue, rate-limit service, new model or paid service was added.

New design generation follows: authenticate → reserve generation run under the existing project → analyze original prompt → approve screen IDs, requirements, tokens and navigation → generate/validate project-specific DESIGN.md → generate editable JSON → structural review and bounded targeted repair → actual browser measurement/capture and one correction → revalidate → apply safe result → existing authenticated Firestore autosave. The original prompt is preserved. Unsafe JSON, broken required screens/navigation/tokens, or remaining fatal browser clipping preserves the last valid design.

DESIGN.md has all 13 required sections. Gemini generates its product-specific prose. FRAME binds the exact approved token appendix deterministically; heading levels are normalized without changing section meaning. An unfenced token block is accepted only when its token values equal the approved system. Missing sections, conflicting token values, conflicting palette literals and omitted stable screen references remain errors. One Markdown repair is allowed before any app JSON request. The same approved document and hash reach draft, structural review, targeted repair and browser correction. Noncritical content omissions receive one additive repair and otherwise yield a partial result with warnings. `kcal` is valid calorie content, never a new screen.

Scoped editor instructions preserve existing manual work and reuse its Markdown as visual guidance. They retain the existing modification pipeline rather than replanning every manually edited screen. Original-plan enforcement applies to new-generation browser correction; subsequent explicit user edits may change screens/tokens and do not replay an obsolete original screen contract. The historical Markdown remains the original visual specification, not a claim that later manual edits were reapproved by Gemini.

## Database compatibility

All paths remain under `users/{authenticatedUid}/projects/{projectId}`. No client-supplied userId determines ownership.

| Path | Fields |
| --- | --- |
| Project | Existing title, initialPrompt, projectType, designDocument, conversationHistory, snapshotId, revision, status, favorite, createdAt and updatedAt; additive userId, productType, generationStatus, currentRevisionId, currentGenerationRunId, schemaVersion, designMdDocument and designJsonSnapshotId |
| generationRuns/{runId} | userId, projectId, idempotencyKey, originalPrompt, status, currentStage, revisionId, attemptCounts, warnings, error, startedAt, updatedAt, completedAt |
| revisions/{revisionId} | Existing createdAt/revision; additive userId, revisionId, generationRunId, originalPrompt, designMdHash, designMd chunk manifest, designJsonManifest, screenIds, status and validationSummary |
| revisions/{revisionId}/chunks/{chunkId} | Existing kind/index/data; new artifacts also include userId, artifactType, byteLength, checksum (nullable), createdAt |

Three intentional compatibility aliases avoid breaking old projects: `designDocument` remains the JSON chunk pointer (Markdown uses `designMdDocument`), `status` keeps draft/ready/deleting (generation status uses `generationStatus`), and chunk content remains `data` (rather than duplicating it as `content`). Product type is additionally exposed as `productType`. InitialPrompt stays immutable; each run/revision records its own originalPrompt. Optional user profiles and lastOpenedAt are not written. No migration rewrites or deletes old data. Legacy chunks/revisions remain readable; new revisions carry the Markdown as separate chunks, not duplicated Markdown inside JSON chunks.

Each run is reserved atomically before inference. Its idempotency key is its unique run ID. Concurrent submissions for the same project cannot both reserve it; a repeated key cannot create a second run. Client duplicate-click locks and existing write-acknowledgement idempotency remain. First generated snapshots use a stable revision identifier; subsequent editor autosaves are legitimate new immutable revisions. A transaction completes the run only when its corresponding revision/chunks and project pointer save successfully. Failed generations leave the previous revision pointer intact. Failed saves retain the existing UID-scoped local pending journal; the UI does not announce a cloud save before acknowledgement.

The UI exposes actual server stages and elapsed time through an optional NDJSON stream on the existing POST endpoint. Progress is persisted by the authenticated client. A normal JSON request still receives the existing app/message fields plus status, projectId, generationRunId, revisionId:null, designMd, designMdDownloadName, designJson, generationArtifact, validation and warnings. Errors retain the existing error string/code and add errorDetails. Streaming HTTP responses use HTTP 200 transport with an explicit final httpStatus; the client handles a streamed 502 as a failure. revisionId stays null until the separate client save succeeds. Proxies must permit unbuffered streams for timely progress.

Generation runs are history, not background execution. Closing the browser aborts the connected server request. A run interrupted before client failure persistence expires conservatively after 15.5 minutes when the project is reopened; it cannot be silently resumed. No process continues a saved run in the background.

JSON manifests and Markdown use SHA-256 over UTF-8; reads verify matching artifacts before hydrating the editor. Chunks remain at most 240 KB with the existing 6 MB atomic-save policy. All owners read/write only their own UID path, revisions/chunks stay immutable, and rules deny other collections. Existing project deletion explicitly removes execution history too.

## Deployment

Deploy the updated Firestore rules before releasing this client; old strict rules reject the additive metadata/run writes. Existing indexes continue to suffice (updatedAt sorting uses the standard single-field index; chunk data is already exempt from indexing).

The server needs the existing GEMINI_API_KEY/GEMINI_MODEL and the public FIREBASE_PROJECT_ID matching the browser configuration (default frame-44bbd). Firebase bearer ID tokens are verified with Google's public signing certificates and issuer, audience, expiry, issued/authentication time and subject checks, following [Firebase's ID-token requirements](https://firebase.google.com/docs/auth/admin/verify-id-tokens). No privileged server writes or service account are required. Signature verification does not check token revocation separately; Firestore still independently enforces authentication and ownership.

Keep existing generation/attempt/client timeout variables. DESIGN.md adds one normal provider request and at most one specification repair. Successful fresh backend generation normally makes five calls (analysis, planning, Markdown, draft, review), plus the existing browser correction when needed. These calls consume the configured project's existing Gemini quota/billing. Stage persistence adds a small Firestore transaction per stage; Markdown adds chunk writes/storage per revision. No additional subscription or infrastructure was introduced. Exact billing depends on the configured project and token usage; no fabricated price estimate is provided.

## Verification and limits

Regression tests cover Markdown ordering/repair/token conflict, unique prompt-specific documents, exact named screen IDs, fitness content/action classification, missing content additive repair, calorie units, stage-stream errors, Firebase signed-token checks, and browser glyph metrics. Existing navigation/screen/targeted-repair, cancellation, editor, auth and persistence regressions remain.

The local Firestore emulator additionally verifies legacy compatibility, run reservation/stages, concurrent users/submissions, duplicate keys/saves, matching Markdown reopen in a fresh repository instance, immutable revisions, failed-generation preservation, corrupted artifact rejection, deletion and cross-UID isolation. Standard tests intentionally skip the two emulator tests unless FIRESTORE_EMULATOR_HOST is set.

Live probes use the configured Gemini model and public SaaS, landing and two-screen fitness fixtures. Their local harness injects an identity solely for testing; this is not a production bypass and does not verify live Google sign-in. Responses/Markdown and Chrome measurements/captures are in ignored `artifacts/fixed-flow/`. Browser export checks view the exact saved Markdown text and verify its downloaded Blob and DESIGN.md filename. Production Firebase sign-in/save/refresh was not performed; authenticated persistence/reopen was exercised against the emulator.

Visual inspection confirms that structural success is not a guarantee of premium composition. The live SaaS output remained sparse and had advisory font/layout warnings. Fitness passed actual browser correction and Markdown export, but the earlier content repair left duplicated calorie/empty-state elements in that historical fixture; the new kcal equivalence prevents that unnecessary repair on subsequent generations. The landing candidate still had real rendered typography/layout defects after one correction and was rejected, preserving the previous design. This is intentionally reported as a failed live acceptance case, not hidden as a successful render.

Actual DOM font Range rectangles can extend beyond their line boxes because of unused font metrics. Painted glyph bounds now distinguish that unused space from real clipping; unsupported metrics retain conservative checks. Deliberate padding/ancestor clipping fixtures still fail. Measurements cover rendered screens and selected responsive widths, with bounded representative screenshots; they do not certify every viewport, image, typography choice, overlap or semantic content requirement. Deterministic content checks currently cover conservative explicit `content/action on screen` clauses; broader semantic requirements rely on the approved analysis/plan and model reviews and are not independently proven. Markdown prose is checked structurally and against tokens/palette/screen identities; every natural-language assertion is not semantically verified.

No commit, push or production rules deployment is performed by this implementation.

## Files changed for this task

Existing uncommitted changes were retained. This task added:

- `docs/fixed-generation-flow.md`
- `scripts/check-fixed-generation-flow.ts`
- `server/contentRequirements.ts`, `server/designDocument.ts`, `server/firebaseIdentity.ts`
- `shared/generationArtifact.ts`, `shared/generationProgress.ts`
- `src/projects/artifacts.ts`
- `tests/designMdFixture.ts`, `tests/fixedGenerationFlow.test.ts`

This task modified:

- `.env.example`, `README.md`, `firestore.rules`
- `scripts/check-render-quality.ts`
- `server/designInstructions.ts`, `server/gemini.ts`, `server/screenRequirements.ts`
- `src/design/api.ts`, `src/design/renderQuality.ts`
- `src/projects/codec.ts`, `src/projects/firestore.ts`, `src/projects/store.ts`, `src/projects/types.ts`
- `src/workspace/store.tsx`, `src/workspace/components/ExportModal.tsx`
- `tests/designApi.test.ts`, `tests/designConsistency.test.ts`, `tests/designPolicy.test.tsx`, `tests/firestore.rules.test.ts`, `tests/geminiRouting.test.ts`, `tests/generationRoute.test.ts`, `tests/navigationContract.test.ts`, `tests/qualityHarness.tsx`, `tests/renderQuality.test.ts`, `tests/requirementScreen.test.ts`, `tests/server.test.ts`

Other pre-existing modified/untracked files were left in place. Verification artifacts/logs are ignored under `artifacts/`; emulator-generated root logs are relocated there. Package manifests, Firebase auth client implementation, editable schema and original contract attachment were not changed in this task.

Final automated verification: 140 tests, 138 passed, two emulator-only tests skipped in the standard suite, zero failures. Both emulator tests passed separately. TypeScript and production build passed. The build retains the existing nonfatal Zod annotation warnings. Controlled Chrome rendering regressions passed; live results and the failed landing acceptance case are distinguished above. No pre-existing automated test failure was observed.
