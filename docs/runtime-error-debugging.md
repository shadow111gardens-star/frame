# FRAME runtime error investigation

## Confirmed design-generation failures

The actual path is the workspace API client → POST `/api/design` → prompt analysis → planning → draft → review → JSON/schema and relationship validation → planned-design validation → frontend application of the successful response. Failed responses do not replace the existing design.

Before the changes, a live request completed all four Gemini stages with HTTP 200, then failed `validatePlannedDesign` because the output design system differed from the plan. The public response was the generic 502 `DESIGN_CONSISTENCY` error, concealing the specific failed check. A separate live `Fitness tracking app` attempt with the configured `gemini-3.1-flash-lite` model revealed omitted optional color/text-style declarations, including references to undeclared text styles. Its repair then failed the planned navigation check. Product type and screen counts matched in those samples. These are confirmed sample failures, not a claim that every historical request failed for the same reason.

The plan and generation instructions disagreed about optional token declarations and choosing scales. Generation now explicitly preserves the supplied system. Omitted optional declarations are completed only from the validated plan before relationship validation; supplied conflicting values are never overwritten. Plan comparison now ignores object key ordering while preserving values and array order. Key ordering was a separately reproduced validator defect, not an established cause of the live sample.

Validation now emits request IDs, stage, safe reason codes, schema field paths, counts, changed token paths and missing journey-edge indexes. It never logs raw prompts, Gemini designs, API keys, Firebase UIDs, authentication tokens or user records. A single additional repair is allowed per request, using the same configured model, existing schemas, deadline and cancellation signal. Repaired output must pass every original check. Failed or exhausted repair remains an error.

The latest full live fitness verification was blocked at analysis by upstream HTTP 429 `RESOURCE_EXHAUSTED`: the Google project exceeded its monthly spending cap. Thus the final revised fitness pipeline has **not** been verified successfully against the live Gemini service. Earlier and later samples used different configured models because the user changed the environment; they are not a controlled model comparison.

## Firestore: confirmed application defects and remaining uncertainty

The supplied Chrome stack matches the installed `firebase_firestore.js`: `StreamBridge.close` → WebChannel close/cancel → request cleanup → `FetchXmlHttp.abort` → `AbortController.abort()` without a reason. This is SDK transport cleanup, separate from `/api/design`. The SDK already catches stream `read()` and reader `cancel()` rejections. FRAME does not create an AbortController for Firestore, terminate its singleton during component cleanup, or maintain application-level Firestore snapshot subscriptions; server reads create transient listeners inside the SDK.

Confirmed application defects fixed:

- A synchronous authentication failure in `saveOne` occurred before the in-flight promise was inserted, leaving a rejected promise cached forever and preventing recovery after authentication returned.
- Duplicate project opens could issue duplicate reads; an older completed load could overwrite a newer selected project.
- Old-account save/load failures could reach a caller's error handler after the account changed and pollute the next account's state.

Operations now guard the captured owner before and after SDK calls and within transactions. Explicit account-change/superseded cancellations are handled distinctly. A returned native `AbortError` retries at most once for the same owner; repeated interruption remains a visible failure with pending work retained. Permission-denied and other genuine errors remain visible. Save retries retain their original write IDs and immutable revisions; deletion retry creates a fresh batch. Existing UID-scoped recovery journals and autosave remain enabled.

This handles application promises; it cannot catch a rejection inside the SDK that never reaches its returned promise. There is no global `unhandledrejection` suppression and no speculative SDK transport/configuration change.

Real installed Firebase SDK checks in Windows Chrome against the **local Firestore emulator** completed 12 server reads, six snapshot subscribe/receive/unsubscribe cycles, 30 rapid double-unsubscribe cycles, four network disable/enable cycles, and termination without unhandled rejections or page errors. A deliberate cross-user read produced `permission-denied`. The exact production Firestore unhandled rejection remains unreproduced, so its underlying rejection leak and resolution are **not confirmed**. Emulator success does not establish production Firebase connectivity.

## Google popup / COOP

The actual Start Designing button opened the real Google sign-in page. The FRAME Vite response had no COOP or COEP header; the observed Google page returned COOP-Report-Only. Closing the popup produced the handled cancellation message. The supplied window.closed warning concerns browser/SDK popup polling; there is no evidence here that it prevents sign-in. Auth methods, credentials and security headers were left unchanged. No Google credentials were entered, so successful real sign-in and UID preservation were not reverified during this investigation.

## Model configuration

At the user's request, `.env.example`, README instructions, server default and routing tests now use `gemini-3.1-flash-lite`, the official [Google model identifier](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite). The local `.env` already contains that model. Analysis, planning, draft, review, bounded repair, modifications and rendered corrections all use the same server-configured model and official adapter, with no fallback model. Explicit deployment environment configuration continues to take precedence. Restart a separately running production server after changing its environment.

## Changed files and checks

Design code: `server/designDiagnostics.ts`, `server/designPlanning.ts`, `server/designInstructions.ts`, `server/gemini.ts`.

Persistence code: `src/projects/operations.ts`, `src/projects/firestore.ts`, `src/projects/store.ts`, `src/projects/types.ts`.

Tests: `tests/designConsistency.test.ts`, `tests/projectCancellation.test.ts`, `tests/geminiRouting.test.ts`, `tests/geminiDiagnostics.test.ts`. Setup/docs: `.env.example`, `README.md`, this report. No Firebase project, database, rules, authentication method or UI replacement.

Validation includes the mocked HTTP route's bounded repair and failure scenarios, semantic system/optional-token/navigation checks, mocked cancellation/retry/cleanup/account-change/write-failure tests, the existing integration suite, real SDK/emulator security-rule/repository lifecycle tests, TypeScript checks and production build. Browser and Gemini evidence is qualified above. No commit or push was made.

Final results: `npm test` — 110 tests, 109 passed, one emulator-only test skipped, zero failed. `npm run test:rules` with the local emulator — one passed, zero failed. The final targeted design/cancellation/model-routing checks — 12 passed. `npm run typecheck`, `npm run build` and `git diff --check` passed. Build emitted only dependency annotation warnings from Zod.
