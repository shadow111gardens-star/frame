# Gemini cost optimization

The normal fresh-generation path is now two provider requests: (1) combined requirement analysis, canonical plan and project-specific DESIGN.md; (2) editable app JSON. Existing strict local requirement, planning, Markdown, schema, font, relationship, token and navigation validators remain. DESIGN.md is approved locally before request 2 begins. The supplied generation-flow contract and editable JSON schema are unchanged; the user's newer cost request changes provider staging, not the logical validation order.

The analysis/planning validators receive local callbacks returning the first response's fields; these callbacks never call Gemini. Markdown's canonical token/screen appendices are constructed locally from that validated plan. Invalid specifications receive at most one material specification repair. If only Markdown is defective, its repair reuses validated analysis/plan and requests only Markdown. Invalid/truncated output cannot replace a saved design. MAX_TOKENS fails safely without escalating the output cap or retrying an incomplete response.

The former structural review request and unconditional screenshot review are removed. Request 2 retains existing design-quality guidance and asks the model to critique its output within that request. Browser measurements, reflow, screenshots, contrast and accessibility checks remain. Captures, whitespace, font-loading and minor spacing warnings alone do not authorize another request. Material errors, broken navigation or contrast can authorize the existing bounded browser correction; failures preserve the previous valid design.

Safe deterministic repair copies exact approved tokens, canonicalizes uniquely identified screen IDs/names and resolves unambiguous existing navigation actions/destination names. It never invents screens, requirements, content or hidden/decorative actions. Full validation runs afterward. Targeted model repairs receive only affected candidate screens, exact diagnostics, screen bindings, relevant plan and the same approved Markdown. Rendered repair likewise sends only materially affected candidate screens and known destination identities to Gemini; the server restores untouched screens before validating the complete design. They return an internal screen patch; FRAME restores untouched screens and revalidates the complete existing app contract. Malformed output recovery uses a bounded excerpt and approved context rather than an unlimited prior response. Noncritical content omissions remain explicit partial warnings instead of speculative paid repair loops.

An actual browser comparison also confirmed an existing local renderer defect: bordered flex groups counted their border twice, grew on every re-render, and could crash React. `flowOuterHeight` now counts borders once and still expands true overflow. The same live SaaS candidate renders after this deterministic fix; no provider repair was needed for that lifecycle defect.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| GEMINI_SPEC_MAX_OUTPUT_TOKENS | 10000 | Combined analysis/plan/Markdown output |
| GEMINI_DESIGN_MAX_OUTPUT_TOKENS | 24000 | Editable JSON and ordinary edits |
| GEMINI_REPAIR_MAX_OUTPUT_TOKENS | 20000 | Material model repair |
| GEMINI_MAX_REPAIR_CALLS | 2 | Physical repair requests across a generation, including rendered repair and transport retries; accepted range 0–3 |
| GEMINI_PRICING_MODEL | optional | Model ID that an explicit pricing override applies to |
| GEMINI_INPUT_USD_PER_MILLION | optional | Input estimate rate in USD |
| GEMINI_OUTPUT_USD_PER_MILLION | optional | Output plus thinking estimate rate in USD |

Output budgets accept 1024–65536 tokens, within the configured model's documented limit. They include thinking where the provider counts it. The defaults accommodate the tested one/two-screen fixtures; large projects can legitimately exceed a cap and fail with a scope-reduction diagnostic. Local Markdown/schema validation remains strict. Schema annotations are removed from requests while supported properties/enums and runtime limits remain; no editable component fields are dropped.

The unchanged configured model is `gemini-3.1-flash-lite`. For that exact model, the fallback estimate uses Google's verified **standard paid list prices** of $0.25/M text/image input and $1.50/M output including thinking, checked October 12, 2026. Unknown models are not assigned this price. Explicit overrides require a matching pricing model. These estimates do not activate billing and are not invoices; free-tier allowances, actual project tier, discounts and taxes are not inferred. See [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) and [usage metadata](https://ai.google.dev/api/generate-content#UsageMetadata).

## Usage and persistence

The adapter captures each physical upstream attempt, including retries and failed/truncated responses. Telemetry failures produce a controlled diagnostic and cannot turn a successful response into another paid retry. Records contain model, stage, repair classification, HTTP outcome, latency, reported prompt/candidate/thinking/cached/total tokens, usage source and estimated USD. An omitted thinking count is marked inferred-zero only when reported total equals prompt plus candidate counts. Otherwise thinking remains unknown. Missing usage is never labeled measured zero: a rough characters/4 input estimate is separately named, disabled for multimodal requests, and not used to fabricate a dollar total. Unknown pricing, unknown thinking or cached usage without a cache price produces an unknown cost estimate.

Generation summaries record request count, repair request count/cost, measured token sums, unknown-usage count, total estimate and pricing configuration. A local persistence failure cancels the connected response stream and retains already measured cost rather than leaving unread generation output running. Ordinary edits start a fresh ledger while reusing the approved Markdown; rendered correction accumulates its original generation's ledger. Privacy-safe usage records are logged separately from request diagnostics. Prompt/Markdown redaction includes the new originalPrompt field; keys, bodies and private prompt text are not usage-log fields.

Cost events travel over the existing optional NDJSON progress stream. The authenticated client persists them to `users/{uid}/projects/{projectId}/generationRuns/{runId}.cost`, including failure records when available. Final artifact metadata saves the matching ledger with the immutable revision's existing JSON chunks. Export shows per-stage usage/cost with the saved DESIGN.md. Ownership paths, authentication, immutable revisions, legacy data and Markdown download are unchanged.

Deploy updated **Firestore rules and indexes** before releasing this client. Rules admit the optional cost map under existing UID ownership. Cost telemetry is exempt from indexing because current UI reads individual run documents; existing project queries/indexes remain. No server admin SDK or privileged writes were added. A disconnect before usage reaches the browser can still leave unreported usage; client-side persistence cannot provide authoritative billing receipts. AI Studio/billing remain authoritative.

Duplicate-click guards and durable Firestore run reservation remain. A bounded per-process replay cache additionally coalesces identical in-flight POSTs, rejects changed input under the same key and replays results for two minutes. It is not a dispatch queue or rate limiter. It does not claim cross-instance provider deduplication for direct API callers; normal UI submissions retain the durable project/run reservation. No background processing, new paid infrastructure or model switch was added.

## Measured comparison

One baseline and one optimized live sample were captured for each identical public fixture using the same configured model. Baseline source was archived from the pre-task HEAD into ignored artifacts; the production route always uses the new path. The old baseline made separate analysis/plan/Markdown/draft/review requests and could incur repair. A discarded initial telemetry-instrumentation failure is excluded from this paired comparison. The comparison is not the total cost of all engineering verification.

The following uses **provider-reported backend token usage**, not characters/4 estimates. Thinking was not separately reported in these samples; reported totals equaled prompt plus output, supporting inferred zero.

| Fixture | Requests before → after | Input tokens before → after | Output tokens before → after | Paid-list estimate before → after | Backend outcome before → after |
| --- | --- | --- | --- | --- | --- |
| Fitness, two screens | 6 → 2 | 27113 → 7759 | 8992 → 4731 | $0.020266 → $0.009036 | valid → valid |
| SaaS dashboard | 5 → 2 | 21584 → 7267 | 6388 → 4049 | $0.014978 → $0.007890 | navigation failure → valid |
| Landing page | 5 → 2 | 22829 → 7320 | 8310 → 4111 | $0.018172 → $0.007997 | valid → valid |

Combined backend estimates: $0.0534165 → $0.024923, a **53.34% reduction in this sample only**. Fitness reduction was 55.41%, landing 56.00%; SaaS's 47.32% compares a failed baseline against a successful candidate and is not a like-for-like successful-output comparison. Summed provider latency was 85.2s → 44.4s, excluding browser/Firestore work. Backend valid-output rate was 2/3 → 3/3; three samples are not a reliable production success-rate estimate.

Backend estimates exclude subsequent browser calls. In actual Chrome workflow probes, fitness and SaaS needed no extra Gemini call and retained two-request ledgers. Landing triggered one paid rendered correction: 6602 input tokens, 1453 output tokens, $0.003830 estimated, making its three-request total **$0.0118265**. Its browser acceptance failed: the workflow preserved the previous design because nav-link-1, nav-link-2 and nav-link-3 still clipped after the bounded correction. Replaying that exact saved correction response reproduced the failure without another paid request. The corrected JSON was also separately rendered and retained advisory overlap/asset/contrast issues. Do not label that attempt a successful end-to-end generation.

Actual captures were inspected for baseline fitness, optimized fitness/SaaS/landing and landing correction. Fitness and SaaS final workflow measurements reported no layout issues; the baseline landing had a clipping error, while optimized raw landing reported asset/contrast/overlap advisories. Font loading differed between probes, so warning counts are not directly comparable. Captures still show sparse composition, an empty SaaS sidebar/activity area and weak landing composition; mechanical validity does **not** prove equivalent premium design quality or complete semantic content coverage. Those remain quality limitations, not concealed successes. Larger multi-seed quality evaluation is needed before making production-wide savings/quality claims.

Raw usage/response evidence: ignored `artifacts/cost-benchmark/{baseline,optimized}-{fitness,saas,landing}.json`. Chrome captures, measurements, runtime diagnostics and workflow results: ignored `artifacts/fixed-flow/`. Live CLI/browser identity is injected locally; production Google sign-in or cloud save was not performed. Persistence/reopen, cost failures, revisions and cross-UID isolation were exercised with the actual Firestore emulator.

## Changed files and verification

Added `server/designSpecification.ts`, `server/generationCost.ts`, `server/generationReplay.ts`, `server/localDesignRepair.ts`, `server/repairRequest.ts`, `shared/generationCost.ts`, `shared/materialDefects.ts`, `tests/generationCost.test.ts`, and this report.

Modified `.env.example`, `README.md`, `docs/fixed-generation-flow.md`, `firestore.rules`, `firestore.indexes.json`; `server/designPlanning.ts`, `server/gemini.ts`, `server/geminiDiagnostics.ts`, `server/geminiResponse.ts`; `shared/generationArtifact.ts`, `shared/generationProgress.ts`; `src/design/api.ts`, `src/design/renderQuality.ts`, `src/design/textLayout.ts`; `src/projects/firestore.ts`, `src/projects/store.ts`, `src/projects/types.ts`; `src/workspace/store.tsx`, `src/workspace/components/ExportModal.tsx`, `src/workspace/components/GeneratedSurface.tsx`; both generation/render verification scripts; and existing design-consistency, Markdown-fixture, Firestore-rules, fixed-flow, Gemini-routing, navigation, render-quality, requirement-screen and server integration tests to reflect the new stages without removing their validation coverage.

Automated verification: 148 tests, 146 passed, two emulator-only tests skipped in the standard run; both emulator tests passed separately. TypeScript and production build passed. Controlled Chrome layout/navigation/deterministic-repair regressions passed. Existing nonfatal Zod build annotation warnings remain. There was no pre-existing automated test failure. Additional regressions cover exact two-request ordering, measured/unknown usage, thinking billing, truncation, scoped repair, ordinary-edit ledger reset, cumulative rendered cost, duplicate POSTs, ownership and bordered-flow stability.

Existing `.firebase/logs/vsce-debug.log` modifications were left in place. Verification artifacts and emulator-generated logs remain under ignored artifacts. Package manifests, API key values, Firebase client authentication implementation and original attached JSON were not changed. No commit, push or production deployment was performed.
