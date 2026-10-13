# Step 3: optional DesignMD references

FRAME retains its two-call normal generation flow: Call 1 produces requirements, the approved screen/token plan and project-specific DESIGN.md; local validation/binding completes before Call 2 generates editable JSON. Existing conditional repair and rendered-layout checks remain in place. There is no model change, selection model call, routine review call, scheduled synchronization, or change to editable design JSON.

## Verified catalog and fields

The live `frame-44bbd` catalog was inspected before implementation. Original `designReferenceCatalog/{slug}` records contain `slug`, `title`, `description`, `category`, `keywords`, `designTokens`, `source`, `content`, `designMd`, license/attribution, provenance and import bookkeeping. The verified local snapshot still contains 84 records at Git commit `c7c1bada4eda972236d124e06ee58df129a9266b`.

71 records have descriptions and reliably parsed YAML token metadata; 13 lack these extracted fields. Keywords are null in all 84 records, and there is no imported tags field. No keywords/tags are fabricated. Categories originate from exact source README links. Token values originate from original Markdown front matter. Descriptive source text is visual guidance, not proof that the reference is a ready-made application template.

Browser SDK reads cannot project away large document fields. A separate compact `designReferenceCatalogIndex/{slug}` was therefore derived from the verified local catalog using the existing Admin import tooling, without fetching an external source or changing the original documents. Its 84 records contain `slug`, `title`, `category`, `keywords`, a source-description excerpt (`summary`, up to 600 characters), available token section names, `sourceUrl`, `contentHash`, summary provenance and idempotent import bookkeeping. No full Markdown, license text or large attribution README is included. Total index JSON size is approximately 85 KB; largest managed record is 1,212 bytes (before audit fields).

## Generate path and reads

`src/design/api.ts` requests an optional reference for **new generation only**. Local deterministic matching uses positive product-category signals, source title/summary/keywords, explicit “inspired by” style mentions and light/dark preferences. Negated clauses do not supply positive matching signals. Ties are deterministic; unrelated prompts may return no match.

The browser reads index metadata through authenticated Firebase client SDK access and caches the index for 15 minutes, scoped by Firebase UID. Concurrent reads share a promise. Failed index reads use a 30-second cooldown. A total 3.5-second selection budget keeps unavailable Firestore reads from blocking generation; SDK reads themselves are not cancellable, so a late result is simply unused. Caller cancellation or a changed Firebase user also discards the result.

After matching, at most one `designReferenceCatalog/{slug}` full document is fetched. Chunked content, if present, is read only from that selected parent's ordered deterministic `markdownChunks/{id}` paths. Slug, source URL, declared hashes, byte count and actual SHA-256 must agree with the index. Invalid, stale or missing content falls back without a reference; the metadata cache expires normally rather than triggering extra reads/retries. The current catalog is entirely inline.

The resulting reference contains source identity, a short summary, at most 12 scalar token samples distributed across token sections, and up to three short typography/layout/spacing source snippets. UTF-8 JSON is capped at 2,400 bytes. Full source Markdown and the catalog are never sent to Gemini. The server validates the optional reference again and quotes it as untrusted data in Call 1. Its system instruction explicitly gives user requirements, product intent, colors/preferences, screens, content, interactions and exclusions priority, rejects copied brands/templates and requires FRAME-supported editable components and fonts. A reference is guidance, never an approved token or navigation contract.

Call 2 and repairs reuse the validated project-specific DESIGN.md and approved plan. They do not resend the external reference. `generationArtifact.styleReference` records slug/source/hash, payload byte count, an explicitly estimated payload token count, the total provider-reported specification input tokens when available, and `measuredAddedInputTokens: null`. This metadata survives existing project/revision persistence without adding user-project parent fields or weakening their rules.

## Cost measurement

No live Gemini generation was performed during this integration. Mocked provider tests verify the two-call sequence and usage propagation; their synthetic usage is not a production measurement. Real provider usage is recorded by the existing telemetry when users generate.

An example Flowspace prompt selected `cal` from Productivity & SaaS: 1,714 reference payload bytes, approximately 429 tokens using bytes/4, plus the 503-byte priority instruction (roughly 126 tokens). These are rough estimates, not tokenizer measurements. Maximum reference JSON is 2,400 bytes; priority instruction/envelope overhead is additional. Provider usage reports total Call 1 input tokens, not the exact marginal contribution of a field; no extra count-tokens request is made.

Firestore usage is 84 index document reads on a cold/expired tab cache, zero index reads on a warm cache, plus one selected full-document read per new generation. There is no full-catalog Markdown download per click. Existing Firestore read/write/storage billing applies; no paid service was added.

## Rules: review and manual deployment required

`firestore.rules` adds only these shared read-only paths:

- `/designReferenceCatalog/{slug}` — authenticated reads; all client writes denied.
- `/designReferenceCatalog/{slug}/markdownChunks/{id}` — authenticated reads; all client writes denied.
- `/designReferenceCatalogIndex/{slug}` — authenticated reads; all client writes denied.

Unauthenticated reads are denied. Existing user-project, generation-run and immutable revision rules are preserved. Admin import tooling bypasses rules and remains outside the browser/generation runtime. Credentials remain outside the repository.

**These rules have not been deployed.** Until reviewed and deployed, production client reads may be denied and FRAME safely uses its existing generation flow without a catalog reference. After review, an operator can deploy only rules with:

```powershell
firebase deploy --only firestore:rules --project frame-44bbd
```

This command is documentation only; the agent did not execute it. Reload after deployment or allow the failure-cache cooldown to expire.

## Manual index tooling and checks

```powershell
npm run designmd:import:reference-index -- --dry-run
npm run designmd:import:reference-index
npm test
npm run typecheck
npm run build
firebase emulators:exec --only firestore --project demo-frame "npx tsx scripts/check-designmd-reference-emulator.ts"
```

The index uses the existing bounded retries, transactions, ownership marker, fingerprint comparison and full read-back verification. Its adapter permits only index parent paths; it cannot write the source catalog or user-project paths. No record deletion occurs. Reports are `artifacts/designmd-reference-index-live-dry-run-report.json` and `artifacts/designmd-reference-index-live-import-report.json`.

Tests cover category selection/no match, compact source extraction, reading only the selected document/chunks, stale/corrupt/missing data and permission fallback, metadata cache deduplication/expiry/UID isolation, index idempotency/path isolation, client request behavior, user tokens overriding reference defaults, DESIGN.md-before-JSON ordering, exactly two normal Gemini calls, source metadata/usage tracking, authenticated read-only rules, user ownership and persisted reference metadata. Test fixture tuple annotations fix pre-existing standalone TypeScript inference issues without changing generated fixture values. App and import/test tooling typechecks pass; all tests and emulator checks pass. Existing build annotation warnings remain unrelated.

## Changed files for Step 3

Added: `shared/designReference.ts`, `src/design/referenceCatalog.ts`, `scripts/designmdReferenceIndex.ts`, `scripts/import-designmd-reference-index.ts`, `scripts/check-designmd-reference-emulator.ts`, `tests/designReference.test.ts`, this document.

Modified: `src/design/api.ts`, `server/designSpecification.ts`, `server/gemini.ts`, `shared/generationArtifact.ts`, `firestore.rules`, `scripts/designmdFirestoreAdmin.ts`, `scripts/designmdFirestoreCatalog.ts`, `tests/firestore.rules.test.ts`, `tests/planFixture.ts`, `package.json` (manual script only). The pre-existing package-lock change, Step 1/2 scripts/data/docs, Firebase log changes and all other existing work are preserved. Nothing committed or pushed. Stop after Step 3; no synchronization or further integration.

## Final verification results

- Live index import: 84 created, 0 updated, 0 skipped, 0 failed, all 84 read-back verified.
- Independent live counts: catalog 84, index 84. Exact managed-field/content comparison confirmed all 84 original catalog records remain unchanged. Report: `artifacts/designmd-step3-live-verification.json`.
- Final full suite: 193 passed, 4 emulator-only skips, zero failures. Separate emulator driver: 7 importer, 3 rules/persistence and 9 reference tests passed; actual 84-record index import and unchanged rerun both verified. Final reference suite (including cancellation/late-response regression): all 10 passed. Final rules-only emulator rerun: all 3 passed.
- Configured application TypeScript checks, strict import/new-reference/rules test compilation (including Vite ambient types), and production build passed. Initial standalone compilation exposed test-only tuple widening and SDK-boundary typing issues; minimal test annotations corrected them without changing fixture content or application behavior.
- Original failed API manifest SHA-256 remains `87858ce39546d53a4633afeb80eff94f7a221bb9136f698b628526e4ca3da890`. No DesignMD API refetch, data deletion, rules deployment, runtime Admin SDK, paid infrastructure, or scheduled job occurred.
