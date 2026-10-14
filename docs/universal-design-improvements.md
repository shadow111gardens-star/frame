# FRAME universal design-generation improvements — 2026-10-09

## Existing functionality reused

The existing analysis → planning → structured draft → JSON critique sequence, strict editable document validation, atomic publication, browser geometry measurement, font loading, text reflow, bounded correction, property editor, prototype navigation, project isolation, undo/redo and export remain in place. No model configuration was changed, dependencies installed, industry journey introduced or service added.

## Phase 1: correctness, policy and redesign isolation

`shared/frame-design-system.json` is a versioned universal policy, not a template catalogue. `shared/designPolicy.ts` validates it at module loading. Its instructions are supplied to analysis, planning, drafting, modification and critique. Actual validators read its screen limit, supported components, fonts and icons. Browser review reads its capture limit and modification-review policy. Policy/schema parity is tested. Unsupported properties are rejected rather than silently discarded from component styles.

Analysis now extracts product purpose, audience/goals, exact count evidence, exclusions and requirement conflicts from the individual request. Explicit Web/App selection still overrides model inference. Ambiguous requests without a selection return clarification rather than silently defaulting to mobile. Original-prompt quotes are checked, exact numeric/English one-to-twenty counts are independently checked, contradictory counts are rejected before an upstream call, and named/excluded screens and counts are enforced before drafting. Counts beyond the supported range return clarification. Semantic conflicts and feature exclusions rely on model analysis and review; the code does not pretend to prove all natural-language requirements deterministically.

Local retrieval no longer uses prompt hashing, industry palette seeds or category-specific generation rules. Explicit art direction and relevant universal feature/accessibility guidance remain. Unspecified direction is derived from the actual audience, product and task. All identified UX needs are retained instead of arbitrarily dropping all but three. A plan requires a visual rationale and a request-derived journey with entries/edges; graph references and reachability are validated, and declared edges must become real prototype links in the generated document. Static collections remain possible; no industry-specific flow or preset screen count is imposed.

AI Designer includes an explicit **Selected screen / Entire project** scope selector, defaulting to selected screen. Both server and client deterministically merge a local redesign into the original document. Unrelated screens, project identity and shared settings are retained. Changed shared tokens are materialized locally where needed. Recomposition may add/remove components inside the selected screen, and conflicting cross-screen IDs or broken navigation are rejected. Project-wide/new-screen instructions require explicit project scope; selected-scope broad instructions receive a useful clarification message. Failure retry metadata preserves the chosen scope. Existing API callers can opt into project scope with `editScope: "project"`.

## Phase 2: schema, renderer and property consistency

Planning-derived documents retain primary, secondary, success, warning and error color tokens in addition to the existing roles. Old documents need not contain the additional roles. Seven named text styles retain actual family/size/weight/line-height choices; linked styles are resolved by the renderer and editable through the Design panel, with local overrides preserved. Existing global color/font replacement also updates named typography. Planning now permits loaded weight 800. Stale guidance claiming shadows, token links or responsive overrides are unsupported was corrected.

Responsive overrides now also support flex direction, gap, alignment and distribution, with corresponding property controls. Existing absolute/flex/grid behavior and dormant absolute coordinates remain. General document/import/export validation accepts externally supplied fonts; generation may only introduce supported fonts or reuse those already in the document. This preserves real loaded-font exports without pretending arbitrary new fonts are available.

Actual rendered inspection revealed that text/flow growth could consume docked navigation space. Reflow now reserves the docked root height when expanding content, including in the offscreen quality measurement path. Regression checks verify that the last visual remains above the dock and that repeated measurements do not keep increasing page height.

## Phase 3: rendered verification

Generated and modified candidates both undergo real browser measurement before publication. Selected-screen modifications render/reflow only the authorized screen, avoiding accidental layout changes to unrelated screens. Captures are attempted even with clean geometry, so a bland but valid screen can receive image-based composition/hierarchy review. The existing Gemini endpoint receives the captures and request/plan context for at most one correction, then browser measurements run again. Original generation's planning/draft/critique stages are retained; this does not add a retry loop.

Measurements include bounds/clipping, actual wrapping, flow overflow, fonts/assets, supported solid-color contrast, peer controls, navigation, spacing and contextual whitespace. Breakpoint-hidden subtrees are excluded from visible clipping checks, while visible invalid geometry remains an error. A weak-text-hierarchy advisory is added without imposing huge headings on compact tools. Quality correction preserves unrelated screens/shared settings and cannot publish remaining measured errors. Successful messages identify only the captures actually submitted for review, not subsequent captures which Gemini never saw. Service diagnostics distinguish rendered-review requests from ordinary modifications.

## Exact source files changed

- `shared/frame-design-system.json` (new), `shared/designPolicy.ts` (new), `shared/editScope.ts` (new).
- `shared/design.ts`, `shared/designQuality.ts`.
- `server/designRequirements.ts` (new), `server/designPlanning.ts`, `server/designInstructions.ts`, `server/gemini.ts`.
- `server/designKnowledge/analysis.ts` (core request analysis; imported catalog and selection were subsequently removed).
- `src/design/api.ts`, `src/design/designProperties.ts`, `src/design/imageExport.ts`, `src/design/renderQuality.ts`, `src/design/textLayout.ts`.
- `src/workspace/store.tsx`, `src/workspace/types.ts`.
- `src/workspace/components/ChatPanel.tsx`, `DesignPropertiesPanel.tsx`, `GeneratedSurface.tsx`, `RenderedDesignReview.tsx`.
- `tests/designPolicy.test.tsx` (new), `tests/knowledge.test.ts`, `tests/server.test.ts`, `tests/planFixture.ts`, `tests/qualityHarness.tsx`.
- `scripts/check-render-quality.ts`, `README.md`, this report.

## Actual verification

- `npm run typecheck`: passed.
- `npm test`: **60/60 passed**, zero failures. Ten additional policy/requirements/journey/scope/token/reflow tests; existing tests remain. Output: `artifacts/design-policy-tests.log`.
- `npm run build`: passed; existing nonfatal Zod annotation warnings. Output: `artifacts/design-policy-build.log`.
- `npx tsx scripts/check-render-quality.ts`: passed in installed headless Chrome. Actual CSS geometry, wrapping, flex/grid, prototype links, one measured correction, responsive column/gap changes, dock clearance, and one-screen correction with unrelated state preserved were checked. Output: `artifacts/design-policy-browser.log`, `artifacts/render-quality/results.json`.
- `npx tsx scripts/check-image-export.ts`: passed after correcting externally loaded-font compatibility. Existing image-format/export acceptance checks passed. Output: `artifacts/design-policy-export.log`.
- `npx tsx scripts/check-canvas-scroll.ts`: passed; long websites, scrolling/navigation/device/responsive behavior retained. Output: `artifacts/design-policy-scroll.log`.

Historical browser verification used controlled renderer fixtures. The current harness uses normal components, named typography and responsive rearrangement. The test asset is deliberately a simple red pixel; it is not generated production imagery. Gemini inference is mocked in the browser acceptance test. No fresh live Gemini project was generated in this task, so no claim is made that all live output now looks premium.

## Remaining limitations and next steps

Image critique currently samples at most two screens per correction. All affected screen geometries are measured, plus declared website breakpoints (at most two per screen), but images are not captured for every screen/breakpoint. Long pages are downscaled for bounded capture; fine details may be too small. Tiled page review and broader capture coverage are next priorities, with explicit latency/payload budgets.

Arbitrary natural-language feature exclusions, semantic journey completeness and aesthetic quality need contextual model/human judgment. A valid navigation graph does not prove that the inferred flow is the best one. Multiple responsive breakpoints and real transactional behavior remain unsupported. Prototype inputs and navigation are not a backend or payment/booking system.

Next evaluation should use live prompts for several unrelated original products and website types, capture their actual output, and assess product understanding, visual distinctiveness, flow correctness and screen-count compliance. Model availability and asset loading can still affect this workflow. Do not interpret successful fixture/browser tests as universal aesthetic validation.

## Imported skill removal (2026-10-14)

Pre-check passed: branch `firebase-clean-work`, HEAD `4c3aa5e` (actual subject `firebase done properally`), clean working tree. The branch and baseline commit remain unchanged.

Removed the imported skill catalog, selector, classification fields, guidance/precedence injection, research quick action and unsupported integration claims. Retained core semantic product detection, exact preferences, named screens, requirement normalization, planning/journey validation, editable schema and renderer contracts, scoped edits, cancellation/timeouts, and the existing baseline generation stages. The attribution files described only the deleted catalog/selection adaptations; no adapted catalog content or callers remain. No new architecture or dependencies were introduced.

Exact modified files (21):
- `README.md`
- `docs/universal-design-improvements.md`
- `scripts/check-analysis-response.ts`
- `scripts/check-design-plan.ts`
- `server/designInstructions.ts`
- `server/designKnowledge/analysis.ts`
- `server/designPlanning.ts`
- `server/gemini.ts`
- `src/components/pages/Changelog.tsx`
- `src/components/pages/Docs.tsx`
- `src/components/pages/Features.tsx`
- `src/components/pages/Roadmap.tsx`
- `src/components/pages/blogData.ts`
- `src/home/components/CenterStage.tsx`
- `src/home/components/GenerationOverlay.tsx`
- `tests/designPolicy.test.tsx`
- `tests/editor.test.tsx`
- `tests/geminiResponse.test.ts`
- `tests/knowledge.test.ts`
- `tests/screenCounts.test.ts`
- `tests/server.test.ts`

Exact deleted files (5):
- `server/designKnowledge/catalog.ts`
- `server/designKnowledge/selection.ts`
- `scripts/check-design-knowledge.ts`
- `third_party/ui-ux-pro-max/LICENSE.txt`
- `third_party/ui-ux-pro-max/SOURCES.md`

Verification: `npm run typecheck` passed; `npm test` passed all 87 tests with zero failures/skips; `npm run build` passed. Existing Zod/Rollup annotation warnings are nonblocking. Tracked-source search found integration names only in negative regression assertions, with no runtime imports, selectors or UI claims remaining. Authentication/session and editor storage/undo/renderer/export source files are unchanged. This baseline contains no Firestore project save/load; it was neither implemented nor verified.

Final Git status: 21 modified files and 5 deleted files, no untracked files. No environment/Firebase configuration, rules/indexes, dependencies, cloud data, stashes or history changes. No paid API requests, deployment, commit or push.
