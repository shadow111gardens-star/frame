# Step 1: approved GitHub catalog import

Successfully imported the complete set of actual DESIGN.md files in the user-approved [VoltAgent/awesome-design-md repository](https://github.com/VoltAgent/awesome-design-md), pinned to commit **c7c1bada4eda972236d124e06ee58df129a9266b**, on 2026-10-13. This is a separate GitHub catalog, not a claim that the 759-style DesignMD API catalog was recovered.

| Verification | Result |
|---|---:|
| DESIGN.md files discovered recursively under design-md | **84** |
| Complete Markdown files copied and verified | **84** |
| Failed imports | **0** |
| Per-document JSON records | **84** |
| Missing or ambiguous document licenses | **0** |
| Exact source Markdown bytes | **2,466,141** |
| Local catalog bytes including attribution and rerun history | **3,172,909** |

Catalog: [data/designmd-github/manifest.json](../data/designmd-github/manifest.json).

Documents and JSON metadata live in `data/designmd-github/snapshots/c7c1bada4eda972236d124e06ee58df129a9266b/styles/`. Original licenses and README attribution live beside them in `attribution/`. Each manifest entry contains the exact local paths and immutable source URL. Metadata includes a title derived from the first Markdown heading (or identified repository-path fallback), path-derived slug, original repository path, pinned commit, Git blob ID, SHA-256 content hash, byte size, fetch timestamp, license paths/source URLs/copyright attribution, and import status. None of these derived metadata fields is presented as an upstream API response field.

## Repository inspection and attribution

The actual Git tree was inspected, not inferred from README examples. It includes names such as `linear.app`, `mistral.ai`, and `opencode.ai`. The discovery walks all tracked entries recursively and selects DESIGN.md by filename under `design-md/`, including deeper paths if present. It does not hardcode a brand count or one-directory-per-brand layout. README descriptions of other assets do not cause nonexistent files to be fabricated or fetched.

The single tracked [root LICENSE](https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/LICENSE) is MIT with copyright **2026 VoltAgent**. No nested LICENSE/COPYING overrides, conflicting SPDX declarations, or missing applicable document licenses were detected. The exact copyright and permission notice was copied unchanged and linked from every document's metadata. The root README and available per-style READMEs were also preserved byte-for-byte; the `slack` directory has no README, so its metadata records that absence instead of inventing one.

The upstream README states that these are analyses of public website design systems and does not claim ownership of the brands' visual identities. That attribution remains preserved. Keep the accompanying license/attribution material with copies of the catalog. No fonts, logos, screenshots, or external website assets were downloaded or treated as relicensed by this import.

## Repeating the operation

```powershell
npm run designmd:fetch:github
```

The script reuses a public shallow clone under `artifacts/awesome-design-md-source`. Initial acquisition used `git clone --depth 1 --no-checkout`. Subsequent normal runs use that cached pinned commit and make **no additional network requests**. An actual cached rerun succeeded with the same 84 source documents. Only an explicit `-- --refresh` fetches the repository HEAD again; new commits get distinct snapshot directories.

The importer reads Git objects directly, without checkout, so Windows CRLF configuration cannot rewrite the source Markdown. Every blob is checked against its tree object ID, then saved as original bytes. SHA-256 hashes and saved JSON/Markdown pairs are checked after writing. A separate independent audit compared all 84 saved files directly with `git cat-file blob` output and verified every saved JSON record.

Filenames contain a safely sanitized repository path plus a path-hash suffix, avoiding traversal, reserved names and case-insensitive collisions. Writes use temporary files and atomic replacement. A local import lock prevents overlapping output writes. Previous manifests are archived under `runs/`; source snapshots and unrelated files are not deleted. Empty, invalid-UTF-8, symlink, submodule, or corrupt-object cases cannot silently count as valid Markdown imports. Missing/ambiguous licensing is recorded explicitly instead of assuming MIT for arbitrary nested licenses.

## Preservation and tests

The original `data/designmd/` API catalog was untouched. Its original manifest SHA-256 remains `87858ce39546d53a4633afeb80eff94f7a221bb9136f698b628526e4ca3da890`; its ten original metadata records and failure evidence remain in place. No additional DesignMD API requests were made.

- **24 import validation tests passed:** six GitHub-import tests plus the eighteen existing API-import regression tests. Coverage includes recursive discovery, byte-exact Unicode/CRLF preservation, metadata/hash correctness, attribution, path safety, licensing overrides/missing/conflicts, empty/symlink/corrupt blobs, partial failures, safe reruns, and refusal to overwrite the API output or unrelated directories.
- Explicit strict TypeScript checks passed for both GitHub scripts and their tests; normal application typecheck passed.
- Task-specific whitespace checks passed. The environment-owned `.firebase/logs/vsce-debug.log` remains a pre-existing unrelated modification.

Exact implementation changes in this task: added `scripts/designmdGithubImport.ts`, `scripts/fetch-designmd-github.ts`, `tests/designmdGithubImport.test.ts`, and this report; added the `designmd:fetch:github` command to the already modified `package.json`. New catalog data is under `data/designmd-github/`; the cache and verification logs are under ignored `artifacts/`. Earlier importer scripts, API records, reports, and all existing uncommitted work were preserved.

No Firestore writes, Firebase Admin SDK, rules/index changes, generation-pipeline integration, scheduled sync, new dependencies or paid services. No commits or pushes. Step 1 is successfully verified for this pinned GitHub catalog; work stops here.
