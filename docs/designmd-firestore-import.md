# Step 2: local DesignMD catalog import

This tool imports the already downloaded, verified catalog only. It does not contact DesignMD or GitHub, run on a schedule, or connect styles to generation. The application, authentication, project storage and Firestore rules are unchanged.

## Source and destination

Input: `data/designmd-github/manifest.json` and its exact referenced snapshot files. The pinned source is `VoltAgent/awesome-design-md` at `c7c1bada4eda972236d124e06ee58df129a9266b`. All 84 Markdown files, metadata files, SHA-256 hashes, Git blob hashes, and referenced attribution files must validate before opening a database connection. Existing API-download evidence is preserved.

Live target: project `frame-44bbd`, default database, `designReferenceCatalog/{sourceSlug}`. Emulator mode instead requires an explicit localhost `FIRESTORE_EMULATOR_HOST` and uses **demo-frame**. Live mode refuses an emulator environment. Only catalog parent documents and their Markdown chunk paths are permitted by the adapter; no queries, deletes or user-project writes occur.

## Credentials and least privilege

Install Google Cloud CLI if needed. Prefer Application Default Credentials (ADC) through impersonation of a dedicated import service account, avoiding long-lived JSON keys:

```powershell
gcloud auth application-default login --impersonate-service-account DESIGNMD_IMPORT_SERVICE_ACCOUNT_EMAIL
```

Replace the placeholder with an administrator-configured service account. The human operator needs `roles/iam.serviceAccountTokenCreator` **on that account**. Node.js supports impersonated ADC. Keep ADC files in Google's standard user configuration directory outside this repository. An existing trusted `GOOGLE_APPLICATION_CREDENTIALS` file outside the repository is also supported, but service-account keys should be a fallback, never pasted into chat or committed. A Firebase CLI login alone is not ADC. See [Google's ADC setup](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment).

Grant the import service account a custom role containing:

- `datastore.entities.get` — point reads and verification.
- `datastore.entities.create` — missing parent/chunk documents.
- `datastore.entities.update` — changed parent/chunk documents.
- `datastore.databases.get` — transaction begin/rollback.
- `datastore.databases.getMetadata` — database metadata access if required by client setup.

Bind to the target database where supported, or target project. No delete, list, export, rules deployment, Owner or Editor permissions are required. IAM does not provide a collection-level boundary here: the script's path guard is an additional restriction, not an IAM sandbox. `roles/datastore.user` is a broader alternative and includes unnecessary permissions. See [Firestore IAM](https://docs.cloud.google.com/firestore/native/docs/security/iam). Admin/server SDK access bypasses client security rules; no rules are modified. See [Admin setup](https://firebase.google.com/docs/admin/setup).

## Commands

```powershell
# Offline source validation; does not claim Firestore verification.
npm run designmd:import:firestore -- --validate-only

# Reads target records; reports planned creates/updates/skips; writes nothing.
npm run designmd:import:firestore -- --dry-run

# Import and read back every expected record.
npm run designmd:import:firestore
```

The report is saved to `artifacts/designmd-firestore-live-report.json`. Emulator reports use `artifacts/designmd-firestore-emulator-report.json` and always identify demo-frame. Dry-run completion remains false because it is not an import. Live success requires all 84 records to pass complete managed-field/content verification after writing. Authentication failure does not mean 84 source records failed: it means the live import was not performed.

## Stored source data

Each parent stores the deterministic slug, title/title provenance, description/category/keywords when available, full unchanged `designMd`, `designTokens`, source GitHub path/URL/commit/Git blob/SHA-256/byte count, original metadata, full license text/copyright/source URLs, root/style README attribution, and import timestamp/run ID. Missing source metadata is null, never synthesized. Locally parsed YAML fields and README-derived categories have explicit extraction provenance. YAML aliases, duplicate keys and unsupported Firestore shapes are rejected for extraction; the original Markdown is retained regardless. Volatile fetch timestamps do not trigger rewrites. A source fingerprint includes all relevant content, provenance and attribution, and exact managed fields are also compared to detect corruption even if a claimed fingerprint is unchanged.

Firestore's document limit is 1 MiB; this tool conservatively budgets 850,000 bytes including field/map overhead. See [Firestore quotas](https://firebase.google.com/docs/firestore/quotas). All current styles fit inline. Oversized Markdown is split at Unicode code-point boundaries into at most 350,000-byte chunks at:

`designReferenceCatalog/{slug}/markdownChunks/v-{fullMarkdownSha256}-{sixDigitIndex}`

The parent has `designMd: null` and ordered `content.chunkIds`, storage mode, original SHA-256 and byte count. Read chunks in this order and join their `text` exactly. Chunk records contain index, parent hash, their SHA-256 and full original text. No content is truncated. Oversized metadata fails safely rather than silently discarding fields. Chunk batches are limited to 20 writes and a conservative 4 MiB estimate; chunks are staged before publishing the parent pointer in a transaction. Old chunk versions are retained, never deleted.

Imports run sequentially, with at most three attempts per operation using bounded exponential delays and jitter for transient Firestore statuses. Permission/authentication errors are not retried. A chunk staging operation has its own three-attempt bound within a three-attempt record operation. Partial failure is reported by slug and sanitized code; successful records remain safe to resume. Unchanged records receive no writes; foreign records without this importer's ownership marker are never overwritten. Transactions recheck parent state and preserve unrelated top-level fields. Audit run IDs avoid double-counting a committed write after a lost acknowledgement.

## Verification

```powershell
npx tsx --test tests/designmdImport.test.ts tests/designmdGithubImport.test.ts tests/designmdFirestore.test.ts
npm run typecheck
npx tsc --noEmit --strict --esModuleInterop --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck scripts/designmdFirestoreCatalog.ts scripts/designmdFirestoreAdmin.ts scripts/import-designmd-firestore.ts scripts/check-designmd-firestore-emulator.ts tests/designmdFirestore.test.ts
npm run build
```

With Firebase CLI and Java 21 available:

```powershell
firebase emulators:exec --only firestore --project demo-frame "npx tsx scripts/check-designmd-firestore-emulator.ts"
```

The emulator driver runs importer and existing rules tests sequentially (rules tests clear the emulator), then dry-runs/imports the **actual local 84-style catalog** and verifies an unchanged rerun. Tests also exercise synthetic oversized Unicode Markdown, bounded retries, partial failures, metadata/source corruption, attribution, deterministic paths, and an untouched user-project sentinel. Automated/emulator verification is separate from live verification.

## Costs and scope

No additional service is required. Live Firestore usage incurs existing plan reads/writes/storage: a new inline catalog needs 84 parent writes, roughly 84 comparison reads, transaction reads and 84 verification reads; unchanged reruns require comparison/readback reads but zero writes. Dry-run requires comparison reads. Automatic indexing of large source strings/maps can add storage; no index configuration is changed in this step. No production cost or exact amount is assumed without checking the project's billing plan. Source MIT license and original attribution remain attached to every style. Stop after Step 2; generation integration is a separate task.

## Results of this implementation session

- Offline validation: all 84 source records verified; no chunks needed; largest conservative parent estimate 169,830 bytes.
- Actual catalog in **demo-frame emulator**: 84 created, 0 updated, 0 skipped, 0 failed, all 84 verified by readback. Unchanged rerun: 84 skipped, zero writes, all 84 verified. Detailed created/dry-run/rerun reports are under `artifacts/designmd-firestore-emulator-*-report.json`.
- Automated tests: full suite 183 passed, 3 emulator-only tests skipped, zero failures. Separate emulator run: all 7 importer tests and both existing rules tests passed. Application and import-tool TypeScript checks and production build passed.
- **frame-44bbd live import is not complete.** Live dry-run stopped at the credential phase; no writes attempted and no live records verified. Configure trusted ADC using the setup above, then run live dry-run, import and readback. The report is `artifacts/designmd-firestore-live-report.json`; it explicitly records the credential block.
- Existing dependency audit findings (1 low / 9 high on app dependency paths) and existing Vite/Zod annotation warnings were not addressed through unrelated dependency upgrades. Emulator runs emitted SDK metadata-lookup warnings while searching for credentials; these did not prevent successful emulator verification and were not suppressed.

Files added for this step: `scripts/designmdFirestoreCatalog.ts`, `scripts/designmdFirestoreAdmin.ts`, `scripts/import-designmd-firestore.ts`, `scripts/check-designmd-firestore-emulator.ts`, `tests/designmdFirestore.test.ts`, and this document. Only `package.json` and `package-lock.json` are additionally changed by the import tooling dependency/script setup. All pre-existing work, local source files, API error evidence, and rules are preserved. Admin SDK and YAML are development dependencies used only in tooling.
