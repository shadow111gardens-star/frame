# Universal UI quality investigation and implementation

2026-10-12. Existing uncommitted cost, validation, navigation, Firebase and project work was preserved. No commit, push, model change, queue, rate limiter or paid service was added. The supplied fixed-flow JSON and persisted editable schema were not modified.

## Confirmed causes and changes

- Conflicting data provenance instructions removed requested sample records after the specification approved them. Both specification and generation now share product-neutral guidance: explicit demo/sample requests permit clearly labeled prototypes; absent personal records still need empty states. Fitness-specific generation-stage prohibitions and an exact duplicated DESIGN.md instruction were removed. This does not invent live activity.
- Gemini omitted container child membership. Flat nodes that were intended as children became root components; a root card at (0,0) visibly covered unrelated labels. Instructions explicitly explain parent-local coordinates and membership. Fresh generation's provider-schema projection now requires every component to supply children (leaves use []). The original optional-children persisted schema and legacy imports remain compatible. Edits and repairs retain the existing provider schema. The projection cannot force a model to populate useful content: empty arrays remain possible.
- Existing bounds/text checks missed opaque surfaces painted over text. Browser checks now detect same-parent later solid opaque surfaces covering text Range geometry in the renderer's ordinary stacking order. These are material errors with exact affected component IDs, routed through existing bounded repairs and revalidated. No speculative local reparenting is performed.
- Whitespace checks required six leaves, ignored sparse tails, and were disabled screen-wide by any empty-state label. New geometry checks inspect first-viewport bands independently, include imagery/chart anchors, and compare visible content to the approved plan's named numeric region budgets. Empty List/Navigation/Card surfaces receive incomplete-content warnings. Empty plan intent and legacy absent plans remain valid. No minimum component count/fill quota is enforced as acceptance criteria. The three-leaf threshold is only an advisory noise gate, not a design requirement.
- A real e-commerce run failed REQUIREMENT_SCREEN because the title parser captured 'Shop for a ... website' as one title. Product-purpose clauses are now separated outside quoted names; articles alone are not screen names. Full quoted titles, case/whitespace mapping, reserved IDs and existing navigation tests remain strict.

DESIGN.md remains the approved visual specification, validated locally before editable JSON. New composition guidance covers audience, hierarchy, region/grid budgets, density/whitespace rationale, responsive stacking, supported assets/charts, accessible states and real editable content. It does not install category templates or a second renderer. Browser review receives the same approved plan. Warnings flow through existing artifact persistence and mark safe results partial; remaining material errors preserve the previous design. Deterministic text/flow reflow runs before paid repair. Fixed-height leaf text directly inside flex/grid now grows its allocated height from actual measurements while preserving x/y/width and skipping native hug/fill sizing; the same helper runs in live and offscreen renderers. Previously such children were excluded from reflow. Subjective spacing/whitespace warnings never authorize an unconditional model review.

## Exact files changed by this task

- server/uiQualityInstructions.ts (new)
- server/designSpecification.ts (preserved existing addition, extended its instructions)
- server/designInstructions.ts
- server/gemini.ts (fresh provider hierarchy projection only)
- server/screenRequirements.ts
- src/design/compositionQuality.ts (new)
- src/design/renderQuality.ts
- src/design/textLayout.ts (safe native-flow leaf text growth)
- src/workspace/components/GeneratedSurface.tsx (same flow repair as offscreen review)
- src/workspace/components/RenderedDesignReview.tsx
- src/workspace/store.tsx (approved plan context for fresh browser review)
- scripts/check-fixed-generation-flow.ts (two additional public fixtures)
- scripts/check-render-quality.ts (browser regression assertions and completion wait)
- tests/qualityHarness.tsx
- tests/universalQuality.test.ts (new)
- docs/universal-ui-quality.md (this report)

Other modified/untracked files predate this task. The environment-owned .firebase log continued changing automatically; it was not reverted. Temporary emulator logs were moved by explicit filename into ignored artifacts.

## Live results and screenshots

These are live calls to the unchanged configured Gemini model, rendered in actual Chrome. Firebase identity is injected only in the local harness; this is not production sign-in verification. The backend 'complete' status below precedes browser warnings/errors and is not a claim of polished output. The final five-category snapshot batch preceded the final mandatory-children projection; a separate live SaaS check below verifies that projection. Calls include conditional specification repairs, not unconditional reviews.

| Category | Requests | Repair requests | Input tokens | Output tokens | Existing ledger estimated USD | Rendered errors |
|---|---:|---:|---:|---:|---|---:|
| saas | 3 | 1 | 9,420 | 4,299 | Unknown (cached pricing) | 0 |
| ecommerce | 2 | 0 | 8,426 | 7,010 | 0.0126215 | 18 |
| landing | 2 | 0 | 8,100 | 4,986 | 0.009504 | 5 |
| fitness | 3 | 1 | 10,570 | 4,804 | 0.0098485 | 0 |
| analytics | 2 | 0 | 8,209 | 3,893 | Unknown (cached pricing) | 0 |

Thinking was not separately reported in these responses; zero is inferred only because provider total equals input plus output. Cached usage without a configured cache price leaves whole-run estimated cost unknown. Reported USD is a list-price estimate from the existing ledger, not an invoice. Normal successful validated generation remains two requests; SaaS/fitness in this batch needed one bounded DESIGN.md repair (three physical calls).

| Category | Before image | After image | Actual inspection |
|---|---|---|---|
| SaaS | [Before](../artifacts/fixed-flow/optimized-saas-render.png) | [After](../artifacts/fixed-flow/quality-final-saas-render.png) | Empty activity surface remains; sample cards were incorrectly treated as roots before explicit hierarchy projection. Not a polished success. |
| E-commerce | No prior valid screenshot; first attempt failed title parsing | [After](../artifacts/fixed-flow/quality-final-ecommerce-render.png) | Six editable sample products rendered. Placeholder images, text budget/clipping and control alignment remain. |
| Landing | [Before](../artifacts/fixed-flow/optimized-landing-render.png) | [After](../artifacts/fixed-flow/quality-final-landing-render.png) | Product-specific editorial type, but incorrect section membership/order, opaque occlusion and excessive unexplained whitespace remain. |
| Mobile | [Before](../artifacts/fixed-flow/optimized-fitness-render.png) | [After](../artifacts/fixed-flow/quality-final-fitness-render.png) | Supported navigation and editable empty/template content; composition remains sparse and the exercise list appears before its intended heading. |
| Analytics | No prior valid screenshot; first attempt failed title parsing | [After](../artifacts/fixed-flow/quality-final-analytics-render.png) | Supported bars and demo value rendered, but requested table/sidebar content is empty and bars lack useful period labels. |

Before images for the three existing fixtures are archived live outputs from the preceding cost task with identical fixture prompts. They are single stochastic samples, not a controlled quality-score benchmark. There is no honest before/after rendered comparison for the two previously failing categories; no baseline images were fabricated. Actual screenshots were inspected, not merely generated. Each JSON remains editable FRAME components; the real-browser controlled suite exercises selection/properties, responsive flow, navigation, clipping, local reflow, opaque occlusion, advisory handling, and unrelated-screen preservation.

The old checker would miss sparse composition/empty surfaces and many opaque collisions. The new checks expose those problems but cannot universally solve composition. Do not advertise these results as universal premium design quality.

## Final hierarchy/flow check

[Final SaaS screenshot](../artifacts/fixed-flow/quality-hierarchy-saas-render.png) was actually inspected. The final provider projection produced real children arrays for sidebar navigation, header, project overview and activity. Unlike prior root-card output, it renders grouped labels, two labeled sample projects and actual activity rows. This is a confirmed membership/content improvement in one stochastic example, not a premium-quality success across all categories. It used **two requests, 8,264 input tokens, 4,883 output tokens**, no provider repair. Whole-run cost is unknown because the first call reports cached tokens without configured cached pricing; the draft's existing estimate is $0.0052755. Browser measurement initially found seven clipping/bounds issues; deterministic flow leaf growth reduced that set to two (nav-list bounds and n1 clipping). Those remaining errors require the existing bounded recovery and last-valid-design protection in production. Sparse composition and fabricated sample identity remain limitations. No extra Gemini call was made solely to improve subjective appearance.

There are 25 completed provider requests recorded across 11 live generation attempts in this investigation (including failed specification attempts), plus one aborted browser-correction attempt with unavailable usage. This total is engineering verification usage, not a normal per-generation requirement. No invoice total is asserted.

## Verification

- npm test: 155 tests, 153 passed, two emulator-only tests skipped, zero failures.
- Firestore emulator separately: both rules tests passed, including UID isolation, generation reservation/concurrent writes, immutable revision persistence, cost and reopen integrity. Emulator transaction-conflict warnings were expected in concurrency tests.
- Focused quality/render tests after the final legacy-position fallback: 15 passed.
- npm run typecheck: passed.
- npm run build: passed. Existing nonfatal Zod annotation warnings remain.
- Controlled Chrome renderer checks: passed, including new opaque-surface regression and empty-list warning.
- Actual saved live outputs across all five categories: mounted in Chrome without React exceptions; screenshots, geometry and defects saved. These artifact-render scripts report defects, not aesthetic acceptance. They do not bypass production last-valid-design protection.
- git diff --check: passed apart from line-ending notices.

During this investigation an attempted SaaS live browser correction was aborted when the acceptance harness checked screen count before asynchronous generation finished. Its provider attempt has unavailable usage; it is not counted as a successful repair. The harness now waits for generation completion. This was a verification-harness defect, not evidence of a production cancellation defect. No broad Firebase suppression or rules changes were made in this task.

## Remaining limitations and deployment

No additional infrastructure, dependencies or recurring service cost. Deploy the normal application server/client build; existing cost-task Firestore deployment requirements remain unchanged. Live engineering verification uses the existing Gemini quota and may incur existing-project usage charges, including unsuccessful/aborted requests. All recorded verification attempts (including failed specification batches) are retained under artifacts/cost-benchmark/quality-*.json; this is distinct from the representative final batch table.

The checks are conservative evidence, not a perfect visual-quality metric. Opaque collision detection excludes transparent, image/gradient and unusual stacking cases. Region budgets may drift during legitimate reflow, so missing-region findings are warnings. No deterministic code invents missing data, redesigns entire screens or guesses missing parents. Actual category output still needs improvement; model completeness, semantic content evaluation, assets and responsive composition remain bottlenecks. Only declared responsive breakpoints are measured by the existing review; arbitrary viewport coverage is not claimed. Production Google sign-in, billing totals and visual equivalence across every valid prompt were not verified.
