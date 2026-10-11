# FRAME design quality fixes

The saved travel reference and actual browser renders showed both generation and rendering defects. This is a reusable pipeline change, not an Explore-specific patch.

| Origin | Root cause | Change |
| --- | --- | --- |
| Planning | Prose-only spatial budgets and duplicate palette representations could disagree. | Required numeric region blueprints in new model requests; derive the editable system from canonical visual tokens. Legacy plans remain readable and strictly validated. |
| Schema validation | Dormant absolute child coordinates were checked even when native flex/grid owns placement. | Layout-aware bounds validation; actual rendered geometry remains checked. |
| Renderer/CSS | Every row fill child used 100% width; grid/hug items overflowed; frames could shrink; margins enlarged the declared footprint. | Remaining-space flex sizing, shrinkable tracks, bounded hug widths, nonshrinking frames and margin-aware allocated boxes. |
| Text renderer | Flow measurements were treated as text, moving headings below empty groups. Wrapped text could exceed source boxes; controls could break words character-by-character. | Distinguish actual text, apply measured reflow before publication, and wrap button labels at word boundaries. |
| Generated styles | Revised literal colors remained masked by unchanged token links. Empty navigation surfaces and uneven peer controls went unnoticed. | Local correction overrides remove stale unchanged links; structural navigation and contextual peer-control checks. |
| Review architecture | The former visual critique saw JSON, not browser output. | Actual renderer snapshot, font/image waits, source-pixel measurements and bounded rendered captures; one targeted Gemini correction followed by remeasurement. |

Whitespace, spacing, sibling overlaps and peer emphasis are contextual advisories. Empty personal-data states and deliberate image/background layering are excluded from simplistic rejection. Gradient/alpha/image contrast is not guessed. Remaining measured clipping or overflow prevents publishing and preserves the previous design and original prompt. Manual modifications do not recompose the whole project.

Changed source files:

- shared/design.ts; shared/designQuality.ts
- server/designPlanning.ts; server/designInstructions.ts; server/gemini.ts
- src/design/api.ts; src/design/layoutStyle.ts; src/design/renderQuality.ts; src/design/textLayout.ts; src/design/imageExport.ts
- src/workspace/store.tsx
- src/workspace/components/GeneratedSurface.tsx; RenderedDesignReview.tsx; DesignIcon.tsx; DesignPropertiesPanel.tsx
- src/index.css

Changed verification/documentation files:

- tests/renderQuality.test.ts; tests/qualityHarness.tsx; tests/planning.test.ts; tests/server.test.ts; tests/editor.test.tsx; tests/exportHarness.tsx
- scripts/check-render-quality.ts; scripts/check-image-export.ts
- README.md; docs/design-quality-fix.md

Actual final verification on 2026-10-09:

- npm run typecheck: passed.
- npm test: 38 passed, zero failed.
- npm run build: passed.
- Chrome quality harness: remaining-space sizing, grid wrapping, image fit, placeholder contrast, margin-safe navigation, website rendering, real navigation, measured text repair and bounded capture/correction passed.
- Chrome canvas harness: Design/Prototype scrolling, 3800px footer, fixed editor panels, anchors, zoom/Fit, device selection, wrapped text, inspector edits, responsive grids and undo/redo passed.
- Chrome export harness: actual PNG/JPEG and ZIP downloads, source dimensions, font/image/icon embedding, mobile, transparency, errors and unchanged state passed.
- Fresh real Gemini travel generation completed after the planning/rendering fixes. Subsequent saved-result replay used a real Gemini correction to align filter controls; it did not repeat planning. Images were allowed to finish loading before screenshot inspection. Explore, Trip Detail, Saved and Profile were captured; the final post-load browser measurements contained no issues.

Evidence is in ignored artifacts/render-quality/live-gemini.png, live-measurements.json, results.json, artifacts/canvas-scroll and artifacts/image-export/latest-run.json. Slow assets can be advisory during the bounded generation review and load later. Subjective art direction and external asset availability still require judgment; no claim is made that every future model output will be production-quality.
