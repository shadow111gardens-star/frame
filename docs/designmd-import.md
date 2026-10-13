# DesignMD local import — Step 1

Run `npm run designmd:fetch`, optionally with `-- --output=path/to/local/catalog`. This standalone TypeScript script uses the existing npm/tsx tooling and Node fetch. It does not load application credentials, call Gemini, write Firestore, or change generation/rendering schemas. No dependency or paid service was added.

Sources inspected: [official developer documentation](https://designmd.app/developers) and [OpenAPI specification](https://designmd.app/openapi.json). The documented API is public, with a limit of 30 requests/minute/IP. The actual listing envelope is `{data, pagination: {page, limit, total, totalPages}}`; requests start at `/api/styles?page=1&limit=50`. Detail uses `/api/styles/{slug}`. The specification declares `designmd` as complete Markdown including YAML front matter.

## Reliability and files

- Every advertised page is requested; empty final pages and empty catalogs are supported. Page failures, changing pagination, and total/unique-count mismatches prevent a complete-import claim. Canonical slugs are deduplicated without changing them.
- Details are requested sequentially, with starts at least 2.1 seconds apart (at most 29 starts in a rolling minute). Retries also pass through this gate. Other activity on the same IP can still exhaust the API quota.
- Each request has a 20-second timeout and at most three physical attempts. Network/body interruptions, 408, 429 and transient 5xx use bounded exponential backoff with jitter and Retry-After. Long 429 cooldowns or exhausted 429 retries halt the batch, mark remaining styles unattempted, and save `rate-limit.json`. Immediate reruns honor that recorded cooldown rather than continuing to probe the API.
- A local output-directory lock prevents overlapping runs. If an import is forcibly terminated, verify its PID is no longer running before removing only its `.import.lock` file; no broad cleanup is needed.
- Complete valid details go to `styles/style-{safe-slug}-{slug-hash}.json` and `.md`. Filenames avoid traversal, Windows reserved names and case-insensitive collisions. JSON retains returned field values and additional metadata. Markdown is the exact returned `designmd` string, including Unicode, line endings and trailing spaces; it is not synthesized or normalized.
- Successful Markdown has a SHA-256 content hash, source URL and timestamp in `manifest.json`. Saved JSON is reparsed and its Markdown compared against the separate `.md` file. Temporary files and atomic renames avoid partial-file writes. Immutable `snapshots/` retain complete JSON/Markdown pairs for recovery if a process stops between replacing the two convenience files.
- Missing full Markdown is a failed import, not a successful metadata download. Actual available detail metadata is retained in `errors/`; no existing successful style files are replaced on fetch/validation failure. A documented `/content` access probe is allowed when detail lacks Markdown, but prose-only content cannot replace full source Markdown. The importer never concatenates reconstructed YAML and prose and never calls a separate token endpoint. The follow-up importer now halts on a `/content` 401/403 contract mismatch and marks remaining styles unattempted; it does not keep requesting primary details after confirmed authorization failure.
- Old reports are preserved in `runs/`. If current listing is unavailable, known slugs can be retained from the old report with `catalogSource: previous_manifest` and pagination marked unverified. `lastSuccessful` identifies retained valid downloads independently of a failed current attempt.
- The final summary includes discovered rows, unique styles processed, successes, failures, unattempted styles, Markdown files saved this run, and actual output-directory bytes including metadata/manifests/backups. An incomplete import exits nonzero. Every individual failure/unattempted reason is in the manifest.

`manifest.json` describes importer state; its extra fields are not presented as fields returned by the source API. Missing content hashes and fetch timestamps are null where no full source or fetch exists. Downloaded files remain local and untracked; review them before any future version-control decision.

## Actual public-API verification — 2026-10-13

The live API differs from its published contract. All **16 listing pages** completed and advertised **759 styles**, with **759 unique canonical slugs**. Inspected detail responses omit `designmd` and return metadata, including serialized-string `keywords` and snake-case `historical_context`; those actual values were preserved. The documented content endpoint returned **HTTP 401: authorization required**. A separate initial API-inspection token request returned **HTTP 403**; token retrieval is not part of the importer and cannot reconstruct missing exact source Markdown.

The first live run collected the listing and stopped after a content authorization failure. A second attempt continued primary details to check the remaining styles but encountered 429 responses with Retry-After beyond 60 seconds. Investigation found that the original loop would continue to other styles after that long cooldown. That verification process was explicitly stopped, its pending entries were finalized as unattempted, and the importer was corrected to halt/persist cooldowns rather than make those additional requests. The corrected cooldown behavior was verified with mocked API responses. No further live requests were made after stopping the blocked run.

Final preserved live-attempt summary:

| Item | Count |
|---|---:|
| Listing pages successfully fetched | 16 |
| Styles discovered / unique slugs | 759 / 759 |
| Unique detail endpoints attempted | 76 |
| Complete style downloads | **0** |
| Failed style imports | 76 |
| Failures with fetched metadata but missing Markdown/content authorization | 10 |
| Detail requests failing extended 429 cooldown | 66 |
| Remaining styles unattempted | 683 |
| Complete Markdown files saved | **0** |
| Raw detail metadata JSON files saved | 10 |
| Local inspection data bytes | 939,090 |

Output: [`data/designmd/manifest.json`](../data/designmd/manifest.json), with actual metadata under [`data/designmd/errors/`](../data/designmd/errors/). The manifest includes all 759 discovered summaries and the exact failed/unattempted slugs and reasons. Every saved JSON document was reparsed; all 16 page records and 759 unique slugs were verified. No complete source Markdown was available to hash or save; zero `.md` files exist in this output. The manifest explicitly records `paginationComplete: true` and `complete: false`.

**The complete style library has not been imported.** Full import remains blocked by the provider's missing documented Markdown/public-content access and rate cooldown. A future run needs the public API to serve its documented data and the cooldown to expire; this step does not introduce credentials or authentication workarounds. No Firestore integration or later generation-pipeline step was started.

## Verification

Mock tests cover multiple pages, empty terminal pages/catalogs, full details, duplicate slugs and advertised-total mismatch, malformed fields and identity mismatch, exact Unicode/CRLF Markdown, metadata preservation, manifest correctness, 429 Retry-After, bounded retries, timeout signals/body network failures, partial failures, safe reruns, previous-file preservation, filename safety, overlapping-run locks and persisted cooldowns.

The importer has explicit standalone strict TypeScript checking because the repository's normal tsconfig excludes `scripts/` and `tests/`. Run:

```powershell
npx tsx --test tests/designmdImport.test.ts
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --types node --skipLibCheck --esModuleInterop scripts/designmdImport.ts scripts/fetch-designmd.ts tests/designmdImport.test.ts
npm run typecheck
npm test
```

Final results: all **11 importer tests passed**; explicit strict TypeScript checking of the importer/CLI/tests and normal application typecheck passed. The complete repository suite had **166 tests: 164 passed, two Firestore-emulator-only tests skipped, zero failures**. `git diff --check` passed with only the pre-existing Firebase log line-ending notice. The live API failures above are separate from automated test results. No production build was needed for these standalone scripts; the application pipeline and bundle inputs were unchanged.

Changed implementation files: `package.json`, `scripts/designmdImport.ts`, `scripts/fetch-designmd.ts`, `tests/designmdImport.test.ts`, and this report. New inspection output consists of the manifest and ten metadata JSON files. The pre-existing `.firebase/logs/vsce-debug.log` modification was preserved; its environment updates are unrelated. No lockfile/dependency changes, Firebase/rules/index changes, workflow changes, commits or pushes.

## Follow-up diagnosis — 2026-10-13

No full import or live resumption was started. The saved manifest and all ten original error metadata files were left unchanged. Their slugs are `minimalism-swiss-style`, `neumorphism`, `glassmorphism`, `brutalism-4`, `3d-hyperrealism`, `vibrant-block-based`, `dark-mode-oled`, `accessible-ethical`, `claymorphism`, and `aurora-ui`.

The prior report finished at 06:37 UTC. No saved cooldown file existed; the old run had not retained the exact Retry-After value, so its duration cannot be reconstructed. A small new probe checked only three saved slugs, each once at the exact documented detail and content URLs, sequentially with ten seconds between requests. No retries, auth headers, cookies, API keys, tokens, redirects, or environment-file loading were used. All six responses were `application/json`; none was 429 or included Retry-After. The probe would stop immediately on a 429.

Evidence is in [responses.json](../artifacts/designmd-diagnostics/2026-10-13T09-20-37-118Z/responses.json), alongside the six complete parsed public response objects. It includes the request URL/method, HTTP status, response content type, Date, server, rate headers, body byte count, a maximum-512-character redacted sample, top-level keys and inspected content-field paths. Responses were read without truncation (well below the one-MiB diagnostic bound).

| Canonical slug | GET detail | Detail bytes | GET `/content` | Detail/content remaining quota | Reset (Unix milliseconds) |
|---|---:|---:|---:|---|---|
| minimalism-swiss-style | 200 | 1,217 | 401 | 29 / 28 | 1791883260000 |
| glassmorphism | 200 | 1,137 | 401 | 29 / 28 | 1791883320000 |
| brutalism-4 | 200 | 1,189 | 401 | 27 / 26 | 1791883320000 |

All responses advertised `x-ratelimit-limit: 30`. Each content error was exactly 40 bytes: `{"error":"Authorization token required"}`. The quota remaining was positive, so the 401s are separate from rate exhaustion. The reset header is a Unix timestamp in milliseconds; its progression is consistent with the minute boundaries during this probe. No claim is made about the exact original 429 cooldown duration.

### Confirmed failure cause and schema comparison

The documented detail endpoint returns a root metadata object with 18 fields, including `id`, `slug`, `title`, serialized-string `keywords`, `historical_context`, and `related_style_ids`. The returned slug matches the requested canonical slug. URL construction uses `encodeURIComponent(slug)`; for these hyphenated ASCII slugs the encoded value is identical. The hash-suffixed local filenames are never used in the API URL. The method is explicitly GET, with `Accept: application/json`.

The complete parsed objects contain **no `designmd`, `content`, or `markdown` fields at any inspected path**, and the actual detail fixture also contains no raw `"designmd":` key. There is no `data` wrapper hiding the document. The importer parses the HTTP JSON root directly and expects `$.designmd`, exactly as the OpenAPI `StyleDetail` schema requires. Its variable named `data` is that root object, not an assumed `.data` wrapper. The field is genuinely missing from the source; JSON parsing/extraction is not discarding it.

The official OpenAPI requires a complete string at `StyleDetail.designmd`, and specifies a `MarkdownContent.content` string for the content endpoint's 200 response. The observed detail response lacks the required field and the content route returns an authorization error instead of that document. The documented no-authentication policy is contradicted by the repeated token-required responses. This confirms a provider-side public-API contract/access mismatch. Whether the internal cause is stale documentation, routing, middleware, or deployment configuration cannot be established from these public responses; no backend implementation was available to prove which one.

**Successful full-Markdown endpoint/field: none verified. Complete Markdown files downloaded: 0.** Detail HTTP 200 is successful metadata retrieval only. No fabricated front matter, prose concatenation, alternate-source download, or authentication workaround was used.

### Importer corrections and safe future resumption

`npx tsx scripts/diagnose-designmd.ts` performs the bounded three-slug probe and saves separate evidence under ignored `artifacts/`; it never overwrites the library manifest or original metadata. Its reusable helpers inspect nested field paths and redact credential-like values before bounding samples.

The importer now halts the remaining batch on the confirmed content authorization mismatch, preserving the failed detail and prior report. Earlier failed metadata is archived under `error-history/` before a changed refetch replaces its convenience file. Extended 429 pauses remain persistent and prevent immediate-rerun requests.

After the official endpoint is independently verified to supply full source Markdown, use `npm run designmd:fetch -- --resume`. This refreshes the pagination to avoid claiming completeness for a stale catalog, verifies existing JSON/Markdown pairs and content hashes, retains valid downloads untouched, and fetches only missing/failed/corrupt pairs. A corrupt cached style no longer invalidates unrelated good cached styles. The summary separates new downloads from `retainedDownloads`. **This command was tested with mocks only and was not run against the blocked live API.**

Follow-up regression results: **18 importer tests passed**. Tests include the actual metadata-only response fixture and actual 401 body, exact `designmd` extraction, nested-path diagnostics, credential redaction, permanent 401 handling without retry, HTTP-date Retry-After, persisted 429 cooldown, partial/incremental resumption, corrupt-cache isolation, and original error-record preservation. Explicit strict TypeScript checks passed for the importer, CLI, probe, evidence helper and tests; application typecheck also passed. Task paths pass whitespace checks. The environment-owned, pre-existing `.firebase/logs/vsce-debug.log` now contains a trailing-whitespace warning; it was not altered or broadly reverted to hide that unrelated check failure.

Follow-up files changed/added: `scripts/designmdImport.ts`, `scripts/fetch-designmd.ts`, `scripts/designmdEvidence.ts`, `scripts/diagnose-designmd.ts`, `tests/designmdImport.test.ts`, `tests/fixtures/designmd/metadata-only-detail.json`, `tests/fixtures/designmd/unauthorized-content.json`, and this report. Prior `package.json` work was preserved. All original downloaded records and the original manifest remain in place. No Firestore/Firebase/schema/generation changes, dependencies, commits, pushes, or Step 2 work.

### Alternatives requiring approval

The preferred path is for the provider to restore or clarify the documented public endpoints, then repeat the small probe before resuming. If that API remains unavailable, a provider-issued official complete-source export could be imported with provenance, or an authorized repository export could be evaluated. The developer portal links [this GitLab repository](https://gitlab.com/fabriciotelles/vibe-styles), but opening it currently redirects to GitLab sign-in; its content and completeness were not verified. Neither alternative has been downloaded or substituted. Approval is required before changing the catalog source. No message was sent to the provider.
