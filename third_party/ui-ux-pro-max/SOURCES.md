# Claude UI/UX Pro Max attribution and adaptation

Upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Reviewed snapshot: `50d8a7de0900119855614541f15a1a616691eb33` (2026-10-09).
Copyright (c) 2024 Next Level Builder. MIT license reproduced in `LICENSE.txt`.

FRAME adapts only guidance from `.claude/skills/ui-ux-pro-max/`, not other Claude skills, the marketplace plugin, CLI, or MCP. No upstream executable script, dependency, asset, font binary, complete dataset or generated screen is shipped. The compact, independently phrased adaptations live in `server/designKnowledge/catalog.ts`; each record identifies its source file and row/style ID.

Used files and scope:

- `SKILL.md`: semantic requirement analysis, design-system-first workflow, small relevant queries, priority and fallback discipline.
- `references/quick-reference.md`: accessibility, layout/text resilience, labels and recovery, navigation hierarchy and chart semantics.
- `references/pro-rules.md`: mobile-only safe areas, platform touch sizing, icon consistency and contrast roles.
- `data/styles.csv`: active minimal/Swiss, editorial, vibrant/block, brutalist, organic, analytical and accessible directions; all effects are constrained to FRAME properties.
- `data/products.csv`, `data/ui-reasoning.csv`, `data/colors.csv`: product-specific fitness, travel, finance, commerce, education and wellness guidance and optional palette seeds. Additional general/productivity/social/creative adaptations use cited active styles.
- `data/typography.csv`: headline/body personality contrast, adapted to loaded/system fonts. Original font imports are not copied.
- `data/landing.csv`: purposeful value/features/action sequencing for web content, not mandatory screens or fabricated testimonials.
- `data/charts.csv`: data/visual matching and labels; unsupported chart libraries/types are not adopted.

Inspected `scripts/search.py`, `core.py`, `design_system.py` and `reasoning_contract.py` for their search/decision architecture and imports. Their local Python search/persistence machinery is not executed, installed or ported. FRAME uses its own small typed catalog and deterministic selector, so Python is not a runtime dependency. The repository's `data-provenance.json` was inspected; upstream claims are not treated as a FRAME accessibility or performance certification.

Conflict resolution:

| Upstream suggestion | FRAME adaptation alongside Appllama |
| --- | --- |
| Semantic tokens rather than raw per-component hex | Maintain semantic project tokens; resolve them to CSS values in existing component properties. |
| Shadows, glass, motion, 3D or platform libraries | Keep feasible composition/color/type intent; no unsupported properties, dependencies or behavior claims. |
| Font pairings from a broad catalog | Use FRAME-loaded Inter/Instrument Serif/JetBrains Mono or supported system families; retain explicit type intent with truthful substitutions. |
| Industry defaults (dark finance, playful learning, orange fitness) | Original requested brand/colors/theme/style win; suggestions are optional and omitted when explicit visual preferences exist. |
| Full chart taxonomy | Vertical bars and horizontal Progress only; editable labels/rows and useful empty states. |
| Native gestures, dynamic text, responsive breakpoints, focus/ARIA details | Only guide representable layouts/labels; do not claim these features are implemented in FRAME's visual prototype. |
| Persisting a design-system MASTER through Python | Existing designSystem/currentDesign remains authoritative in the existing editor session; no new persistence layer. |

Appllama's existing mobile hierarchy, safe-area/touch guidance, peer/deeper navigation, 4/8 spacing, consistent tokens and restrained surfaces are retained. Shared fundamentals are not duplicated as separate full skill documents. Selected excerpts are internal generation context, never runtime demo content or editor chrome.

The selector caps a request at six records, never loads the upstream repository at runtime, and falls back to clearly identified general guidance for unmatched categories. It uses deterministic prompt hashing only to choose among equally applicable unspecified directions, not to detect product type or override explicit preferences. Initial semantic analysis shares the existing Gemini intent call; scoped edits need no analysis API call.
