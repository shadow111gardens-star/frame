# FRAME Phase 1

Existing FRAME screens and editor chrome are retained. Generation and AI chat use a shared, validated editable design schema (`shared/design.ts`). Screens contain flat component records with optional child ID references; nested coordinates are relative to the parent. Images remain individual components.

## Run

Requires Node.js 22 or newer.

1. `npm install`
2. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env` (see `.env.example`). Keep the configured model; there is no fallback model.
3. `npm run dev` and open `/#home`.

Restart the server after changing environment variables. The key is read only by `server/gemini.ts` and is never included in the browser bundle. Never use a `VITE_` prefix for credentials.

For a local production build: `npm run build` then `npm start` (port 3000, configurable through `PORT`). The Node server serves both the built app and `/api/design`. Static hosting alone cannot serve the Gemini route. Hosting publicly will need deployment-specific access control and rate limiting.

## Workflow

Generate opens the existing editor immediately. The left panel shows the exact prompt and a real request-in-progress state; after validated JSON arrives, all requested screens appear in the existing tabs. Click a component to edit its text, geometry, color, typography, spacing, opacity, border and radius in the Design panel. Image source, icon, progress and chart data are editable. Select nested children independently. Delete and undo/redo work with the same state.

Chat sends the current edited design, active screen and instruction to Gemini. The response is a complete structured design update with stable IDs and unrelated elements preserved by the model's instructions. Invalid responses never replace the current design. Failed requests expose a retry action; duplicate requests are locked. If manual edits occur while a request is running, its result is discarded so those edits are preserved.

Generated designs stay in client memory, including navigation away and back. Refresh starts a clean editor and discards the generated design safely. No database or new project persistence is implemented. The editor has Design and Prototype modes; its Code tab and view have been removed. Import remains a future feature.

## Checks

`npm run typecheck`, `npm test`, and `npm run build`.

The tests cover schema rejection, server request behavior, and the React generation/edit/modification workflow in a DOM environment. Live API validation requires the configured key/model and network access.

Fresh home and editor states have no seeded projects, screens, components, messages, account identity, or credit balances. Legacy home storage is sanitized so old demo entries cannot reappear. The sidebar lists only a generated design that exists in the current client session. Device changes never create preset screens.

## Website and mobile intent

Before generation, the configured Gemini model classifies the complete prompt semantically as `website` or `mobile_app`. It considers indirect intent, negation, and the primary deliverable; truly ambiguous requests retain the mobile default. Classification and generation both happen on the server. The result is validated against the detected type and viewport width constraints.

`productType` is required in the shared design schema and preserved in editor state, session snapshots, JSON exports, and undo/redo. AI modifications use the existing type without reclassification. A response that switches type is rejected, leaving the current design intact.

`shared/product.ts` owns default viewport dimensions, frame choice, fit limits and device defaults. Design and Prototype use the same component renderer. Prototype embeds the actual component viewport in a phone or a browser frame; generated `targetScreenId` links navigate between real screens without replacing the frame.

For optional live semantic verification with the configured model: `npx tsx scripts/check-product-intent.ts`. This sends six public example prompts to Gemini and checks the four required cases plus two indirect-intent cases; it uses no runtime demo data.

## Design-quality instructions

`server/designInstructions.ts` adapts static principles from [Appllama's app-design skill](https://github.com/Appllama/appllama-skills/blob/main/skills/appllama-app-design-skill/SKILL.md) into Gemini's existing generation instructions. Mobile requests receive platform-aware hierarchy, spacing, navigation, touch-target and state guidance; website requests receive separate desktop guidance. Both use the existing editable JSON schema and a consistent design system across screens.

Initial generation now has two creative stages after intent detection: `server/designPlanning.ts` asks the configured Gemini model for a validated internal product plan, semantic visual tokens, and screen compositions; visual generation translates that plan into the existing component schema and makes a focused critique/revision call before publishing the result. This review addresses hierarchy, text fit, repetitive composition and invented personal data in the draft. Neither the plan nor draft is rendered as user content. Final validation requires the planned screens and exact shared design system, visible component bounds, available fonts and populated control labels. Invalid plans/results leave the editor unchanged and expose the existing retry flow. Planning and review add API calls and latency; all stages share a deadline within the existing client timeout. No additional model is hardcoded. Simple modifications skip initial planning/review and retain their single scoped request.

Rich planning roles (type sizes/weights, semantic status colors, spacing, radii and control sizing) guide existing component properties. They do not add schema fields or unsupported rendering features. The instructions account for absolute coordinates, supported icons/chart types, text fit and full declared screen bounds. Long websites scroll inside the constrained canvas; their content is not squeezed into the initial viewport. Shadow and custom line-height properties are not implemented.

For fresh generated designs, text-bearing leaf cards/lists/inputs/search fields receive missing insets from the planned spacing roles so labels do not sit against surface edges. Explicit padding and all nested child coordinates are preserved; modifications skip this normalization. Common 999px pill tokens are canonicalized to the existing 500px shared token limit before plan validation.

Modification instructions preserve manual edits, component and screen IDs, unrelated content, and existing design tokens unless the user requests changes. These are model instructions, with schema validation still enforcing response structure. No Appllama service, MCP, API, credits, runtime skill download, or copied screens/assets are introduced.

Optional live acceptance check: `npx tsx scripts/check-design-quality.tsx`. It generates the requested premium travel and fitness projects, validates all four screens, renders them through the actual editable component renderer, and checks scoped AI refinements preserve tokens, IDs and other screens. It writes JSON and HTML previews to ignored `artifacts/design-quality/` for visual review; these are never runtime demo data. This sends real requests to the configured Gemini model. Automated checks cannot certify subjective visual quality.

## Local Claude design intelligence

FRAME combines the existing Appllama instructions with selected adaptations of the Claude `ui-ux-pro-max` skill. Source files, pinned upstream revision, MIT notice and conflict decisions are documented in [third_party/ui-ux-pro-max/SOURCES.md](third_party/ui-ux-pro-max/SOURCES.md).

The existing initial intent call now also analyzes audience, category, positive style/theme/brand/color/type preferences, goals, requested screen names, website sections and UX needs. `server/designKnowledge/selection.ts` retrieves at most six relevant records from `catalog.ts`, plus optional feasible font/palette suggestions. Explicit preferences override industry defaults; palette suggestions are suppressed for explicit visual requirements. When a direction is unspecified, deterministic selection among relevant alternatives avoids a single default art direction. Unknown categories use identified general guidance, not a fictitious dataset match.

Actual flow: prompt → semantic analysis and authoritative productType → local knowledge selection → validated internal plan → editable Gemini draft → critique/revision with the same selected knowledge → schema/type/plan/renderer validation → existing editor and prototype. Named requested screens must survive planning. Neither analysis nor selected rules are exposed in the editor.

Chat uses the existing currentDesign, active screen and exact instruction. Local edit retrieval supplies only relevant refinements; the current tokens, component IDs, manual edits and unrelated screens remain authoritative. There is no extra model call for knowledge retrieval or chat analysis. Initial generation retains its existing four calls (analysis, planning, draft, review); simple modifications retain one. No new dependencies, provider, CLI, plugin, MCP, repository fetch or paid design service are added.

This is a curated subset, not the whole upstream catalog. Local edit matching is conservative and may fall back to general guidance for an unfamiliar product or phrasing. Original instructions still reach Gemini intact. Design quality and semantic interpretation depend on the configured model; responsive breakpoints, unsupported fonts/effects, advanced charts and native/complete accessibility behaviors remain outside the current editable schema.

Optional live verification of semantic analysis and retrieval: `npx tsx scripts/check-design-knowledge.ts`. It sends two public prompts using the configured model, including indirect website intent and explicit editorial mobile intent, and checks that brand/color/font requests survive while default palettes/fonts are suppressed. This checks live analysis, not final visual quality.

## Canvas scrolling

Design mode has one constrained canvas scroller. Website Fit fits the page width, retaining the full declared content height; numeric zoom preserves horizontal and vertical inspection. Prototype websites scroll inside the browser viewport, whose height follows available editor space. The outer website preview cannot compete for vertical scrolling. Editor toolbars and panels remain outside these scroll containers. Mobile previews retain their phone frame and scaling.

Website components may use `targetComponentId` for same-page section anchors. Targets are validated on the same screen and cannot be combined with `targetScreenId`; Prototype scrolls only its own viewport, without changing FRAME's routing hash. Existing screen links remain supported. Older designs without anchor targets need those targets added through AI editing; labels alone do not imply a destination.

Browser acceptance check: `npx tsx scripts/check-canvas-scroll.ts` (installed Chrome; optionally set `CHROME_PATH`). It uses an isolated test-only 3800px portfolio fixture in the actual editor, native CDP mouse-wheel input, Fit/100%/200% zoom, fixed-panel geometry checks, nested footer anchors, selection/edit/undo/redo, resize, and the mobile frame. No Gemini request or automation dependency is required. Results are saved under ignored `artifacts/canvas-scroll/`; the fixture is never imported by the application entry point.
## Gemini response diagnostics

The analysis request schema is derived from its Zod validator, including supported `maxItems` bounds. Previously the model was allowed to return unlimited style hints while runtime validation allowed three; live four- and seven-style requests reproduced the generic analysis error with HTTP 200 and valid JSON. Runtime limits remain unchanged. Full original prompts continue through planning and generation even when analysis prioritizes three directions.

Server response handling separates final text from thought parts, validates API envelopes and completion reasons, and parses either complete JSON or a complete Markdown JSON fence (including BOM/whitespace). It never repairs malformed JSON or skips schema validation. Invalid analysis reports field paths and issue codes; empty, malformed, truncated, blocked and configuration responses have distinct errors. Current designs and original prompts are preserved. The chat no longer appends a generic resend instruction or offers blind Retry for a known permanent error.

Only transient transport failures and HTTP 408/429/500/502/503/504 can retry, at most twice per stage (three total attempts), within the existing overall deadline. Exponential backoff includes jitter. Retry-After is respected when it fits the remaining budget; otherwise the original upstream error and retry guidance are returned for later retry, without falsely claiming a timeout. Sanitized diagnostics include Google error metadata, stage, attempt and elapsed time. Schema, JSON, safety, truncation and configuration errors never automatically retry. The configured model, provider, structured design schema, normal four-stage generation flow and single-call modifications remain unchanged.

Set `GEMINI_DEBUG=1` for opt-in development-only analysis diagnostics (response character count, validator field paths and issue codes). Generated free text, user prompts, raw response bodies, request headers and API keys are never logged. `npx tsx scripts/check-analysis-response.ts` uses public diagnostic prompts and the production transport/parser; raw responses stay in memory while only structural types/counts are printed. It exits unsuccessfully if live analysis fails. Official structured-output constraints: https://ai.google.dev/gemini-api/docs/generate-content/structured-output.
Planning also retains numeric bounds in its Gemini schema: typography sizes/line heights, radii, spacing, and product-specific touch targets. Scale role names are enums. Required text must be nonempty. The previous planning converter removed all these numeric bounds, allowing plans with radii above 1000 (and shared radii above 500) that then failed local validation. Planning errors now report field paths or the failed consistency rule and are marked non-retryable.

Unlike the smaller analysis schema, adding `maxItems` throughout this large planning schema was rejected by the configured model with HTTP 400. Isolated requests verified that removing numeric bounds did not resolve that rejection, while removing array upper bounds did. Planning therefore keeps all array lengths/caps strict in Zod and expresses upper bounds/exact counts as descriptions and instructions; supported minimum counts, numeric bounds and enums remain in the request. Runtime validation is never bypassed.

`npx tsx scripts/check-design-plan.ts` verifies analysis and planning for the reported portfolio prompt, saved only as a test fixture in `tests/portfolioPrompt.txt`. `--all` also checks smaller website/mobile requests and a typography-bound case. `--generate` verifies the full real `/api/design` pipeline for that prompt, including draft/review and final editable schema validation. These checks send real Gemini requests; diagnostics print only controlled structural/numeric metadata, never keys or full responses. The prompt fixture is not rendered or imported by the application.
The editable output schema converter now also retains numeric limits (including screen height, component sizes and style radii) and the allowed font-weight enum rather than advertising an unrestricted number. Draft schema/relationship errors expose controlled field paths or validation reasons and preserve the current design. Verification on the full reported portfolio prompt returned HTTP 200 through analysis, planning, draft and review, with one validated 1440 × 4000 website and 70 structured editable components. This verifies generation/schema compatibility, not a guarantee that every requested behavior outside the renderer's supported capabilities is implemented.
## Text spacing and device viewports

The renderer measures actual wrapped text after render and font loading. Text boxes and parent groups grow when needed; following content moves down while retaining column alignment and intentional decorative layers. Existing text collisions receive a minimum eight-pixel gap. Parallel columns contribute their maximum growth rather than accumulating redundant whitespace. Layout fixes update the editable positions and inspector together, share the originating edit's undo step, and reject stale measurements. Display sizes (32px and above) use 1.15 leading; smaller text uses 1.5, shared with server inset sizing. No text is truncated or shrunk to conceal wrapping.

Full page/group height is now bounded at 20,000px, with matching validation, generation guidance and inspector limits, allowing a page to grow naturally after text sizing instead of cutting off its footer at 4000px. Width/product-type constraints remain enforced. Automatic reflow is intended for ordinary text flow within these bounds, not arbitrary intentionally overlapping typography.

Website Prototype now uses the selected laptop's logical width and nominal height, constrained to visible editor space at the current zoom. The source design width stays unchanged; larger viewports center it, and smaller viewports allow horizontal inspection. This preserves absolute-coordinate designs rather than claiming automatic CSS breakpoint generation. The status bar shows the chosen device dimensions in Prototype and design dimensions in Design mode. Mobile phone framing/scaling and scrolling remain supported.

The browser acceptance script also clicks the real MacBook Pro 16/Air 13/Air 15 dropdown entries, asserts viewport widths change without rewriting components, and verifies that a wrapped headline and supporting paragraph have no overlap. A screenshot is saved to `artifacts/canvas-scroll/text-spacing.png` (test-only content).

### Global design property editor

The Design tab reads the structured design across every screen on every render. It separates declared tokens from actual component/screen uses, and available font variants from used variants. Font pairing, distinct text/heading styles, color roles/component colors, alpha values, gradients, spacing/radius scales and shadows come from the current data. Inferred typography hierarchy is labeled explicitly. No demo design values are seeded.

Component controls edit validated styles, content, parent-local geometry, navigation targets, opacity, border, shadow, typography, alignment and layout. The same GeneratedSurface renderer handles Design and Prototype for website and mobile app frames. Optional CSS flex/grid controls support direction, columns, gaps and alignment; existing absolute layouts remain absolute until changed. Width/height modes now render as fixed/fill/hug instead of being decorative controls.

Shared colors can be linked explicitly using a component/screen role selector or **Link matching uses**. Token edits affect linked uses; a local color edit detaches its link. **Actual colors across screens** edits deliberately replace every matching literal/token value, including screen backgrounds. Identical values are not silently assumed to have the same semantic role. Spacing/radius links refer to declared scale indexes; scale edits affect linked styles, while local edits detach the link. Removing referenced indexes is rejected. Font role edits affect linked uses and inherited body text; the Used typography family editor explicitly replaces all matching family uses.

Typography variants are based on Google Fonts metadata and the variants actually requested in index.html:
- [Inter metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/inter/METADATA.pb)
- [Instrument Serif metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/METADATA.pb)
- [JetBrains Mono metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/METADATA.pb)

Inter and JetBrains Mono request normal/italic weights 300 through 800. Instrument Serif requests normal/italic 400 only. System/custom font availability is explicitly unverified; no additional variants are advertised. FontFaceSet load checks show load failures and the renderer uses a fallback with synthesized weights/styles disabled. Google Fonts remain network-loaded, so offline/network failure can activate the fallback.

Optional responsive overrides support a maximum logical viewport width, font size, padding, grid columns and visibility. In Prototype, a design with explicit responsive overrides uses the selected device's content width; website scrollbar space is excluded. Mobile breakpoints use logical device width, not scaled visual preview pixels. Source geometry is preserved; breakpoint previews do not reflow and persist changes into source positions. These controls do not automatically convert an existing absolute layout into a complete responsive website: configure fill/native flow and explicit overrides as appropriate.

Undo/redo and JSON/API round-trips preserve all new optional style fields and token links. Existing schema validation remains bounded. `tests/designProperties.test.ts` verifies extraction, variants, links, responsive resolution and alpha conversion; `tests/editor.test.tsx` drives actual panel controls for both products and exercises every supported device frame. `npx tsx scripts/check-canvas-scroll.ts` checks browser-computed typography/colors/shadows, token/local edits, grid and device-width breakpoints, alongside scrolling/anchors/zoom/selection/undo/redo. Browser evidence is written to ignored `artifacts/canvas-scroll/`.


## Screen image exports

Screenshots in Export Project supports PNG and JPG/JPEG. Current Screen downloads one image; All Screens downloads a ZIP of independently named images. Source dimensions and long-page content are preserved. JPEG has a configurable background; PNG preserves transparency.

Export captures an immutable, unscaled renderer snapshot, embeds accessible images/fonts, and rasterizes its computed CSS locally. An internal browser capture intermediate remains for raster exports and rendered design review; editable vector scenes and downloadable SVG are not supported. Static UI icons remain. Asset access, cancellation, dimension and archive limits are preserved. Image ZIP packaging uses the existing fflate dependency.

Offline browser verification: `npx tsx scripts/check-image-export.ts` exercises actual PNG/JPEG downloads, ZIP files, dimensions/footer pixels, typography/assets, transparency, complex CSS, missing assets, mobile screens, cleanup and unchanged editor state. Model inference is not used by this harness.

### Measured design quality

Generation now follows planning ? structured draft ? structural review ? offscreen browser rendering and measured text reflow ? at most one targeted Gemini correction ? browser remeasurement ? publish. New planning requests require numeric region budgets (layoutBlueprint) as well as purpose, hierarchy, density and tokens; older internal plans remain readable. Structural schema validation stays strict. Flex/grid children retain dormant absolute coordinates for switching modes; bounds validation evaluates those coordinates only in absolute layout.

The actual GeneratedSurface renderer is used for review, with an immutable candidate snapshot, no selection outlines and no workspace dispatches. It waits up to five seconds for fonts and three seconds for images; capture assets have an eight-second budget. It checks text clipping, flow overflow, source dimensions, sibling text/control overlaps, solid-color contrast, near-scale spacing inconsistencies, failed assets and missing loaded font faces. Website breakpoint widths are measured too. Intentional parent/image layers are excluded from collision tests. Large interior empty bands are contextual advisories on populated screens, not automatic failures; personal-data empty states are excluded. Gradient/image backgrounds and alpha compositing are excluded from simplistic contrast checks.

Generated and modified unpublished candidates can send bounded rendered-DOM JPEG captures even when geometry checks find no defects, for a composition/hierarchy review (up to two, 500KB each) and component-level measurements to the existing Gemini endpoint. Captures are best effort when cross-origin assets cannot be embedded. One correction is allowed, never a retry loop. Changed literal local overrides remove stale unchanged token links so the correction actually renders. Protected tokens, original screen/component identities and unaffected screens are retained deterministically, then full schema/relationship validation and browser measurements run again. Remaining clipping/overflow prevents publishing and preserves the user's prompt and previous design. Advisory aesthetics/contrast/asset issues do not erase creative compositions. Manual edits do not trigger whole-project recomposition.

Renderer improvements include remaining-space flex sizing, shrinkable grid tracks, wrapping hug widths, nonshrinking source frames, explicit image crop/fit controls, overflow controls, bottom docking, consistent icons, neutral button padding and design-colored input placeholders. New style controls remain editable in the Design panel. Existing absolute layouts remain supported.

Run `npx tsx scripts/check-render-quality.ts` for installed-Chrome regression measurements and screenshots, or add `--live` to exercise the configured Gemini model (uses the existing API and incurs model usage). Test-only data never enters normal projects. Artifacts are stored under ignored `artifacts/render-quality/`. This provides measurable layout verification, not a guarantee of subjective aesthetic quality or external image availability.


Quality verification completed on 2026-10-09: typecheck, 38 automated tests, production build, installed-Chrome quality/canvas/export checks passed. A fresh real Gemini travel generation completed after the pipeline fixes. Its saved structured result was then replayed with `--live-saved` (no fresh planning call), and a real Gemini correction aligned the peer filter controls. The final rendered screens were captured after images loaded; browser checks reported no remaining measured issues. See `artifacts/render-quality/live-gemini.png` and `live-measurements.json`. Slow assets may be advisory during the bounded initial review and load later; subjective styling still needs judgment.

`npx tsx scripts/check-render-quality.ts --live-saved` reuses the last saved real Gemini app for generation and routes correction requests to the real configured model. It isolates correction/renderer regressions without repeating planning. The regular command uses isolated automated fixtures. Absolute positions include margin allocation; fill uses the available space after its starting offset. Peer control height differences are contextual advisories, and button labels wrap at word boundaries. These behaviors apply to every supported design, without screen-name-specific rules.


FRAME universal design policy (v1.1.0) is validated from `shared/frame-design-system.json` and integrated into analysis, planning, generation instructions, capability validation, redesign scope and browser review. No industry palette, predefined journey or prompt-hash selection is used. Explicit counts/named screens/excluded screens are checked; conflicting requests return clarification without replacing the document. Planning includes a request-derived navigation graph and visual rationale.

AI Designer edits default to **Selected screen**. Choose **Entire project** for new screens or shared/global changes. Server and frontend merge selected-screen updates into the original document, preserve unrelated screens and shared settings, and keep token changes local. Browser review also runs for modifications. Named text styles, semantic primary/secondary/status colors, responsive direction/gap/alignment overrides are editable. General import/export validation continues to allow externally supplied fonts; generation cannot introduce fonts outside the configured capability list or current document.

See `docs/universal-design-improvements.md` for exact changes, acceptance checks and limitations. Captures currently sample at most two screens; very long pages are downscaled, not tiled. Browser checks and sampled image review do not guarantee subjective premium quality or verify every breakpoint.

## Generation API

FRAME uses only the official Google Gemini API through `server/geminiResponse.ts`. Configure server-only `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.8-flash`, then restart the server. Analysis, planning, draft, review, modifications and browser-rendered corrections all use this adapter with the existing schemas and validation. Credentials must never use a `VITE_` prefix or enter source control.

The API reports nonsecret routing evidence in `X-FRAME-Provider` and `X-FRAME-Model` response headers. Offline routing tests mock every upstream call; they do not establish live model availability. Gemini's existing retry, cancellation and deadline handling remain in place.
## Firebase Authentication

FRAME uses the supplied `frame-44bbd` web configuration directly; no Firebase environment file is required. See [Step 1 authentication setup and verification](docs/firebase-auth.md) for routing, manual Console checks, and live-login acceptance steps.

## Firestore project persistence

Authenticated projects now save under `users/{firebaseUID}/projects/{projectID}`, including the editable design, conversation, and editor preferences. Existing project actions and debounced autosave use Cloud Firestore. Publish the supplied rules/indexes before using production persistence; see [Step 2 setup, schema, security, tests, and limits](docs/firestore-persistence.md).
